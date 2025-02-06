/* eslint-disable camelcase */
import { clerkClient } from "@clerk/nextjs/server";
import { WebhookEvent } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { Webhook } from "svix";

import { createUser, deleteUser, updateUser } from "@/lib/actions/user.actions";

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    throw new Error("Please add WEBHOOK_SECRET to .env");
  }

  // Get headers correctly
  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Error occurred -- missing svix headers", {
      status: 400,
    });
  }

  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Verify webhook with Clerk's new method
  const wh = new Webhook(WEBHOOK_SECRET);
  let evt: WebhookEvent;

  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error("Error verifying webhook:", err);
    return new Response("Error occurred", { status: 400 });
  }

  const { id, type: eventType } = evt;

  // User created handler
  if (eventType === "user.created") {
    const { id, email_addresses, image_url, first_name, last_name, username } = evt.data;

    // Handle potential missing email
    const email = email_addresses[0]?.email_address || "";

    const user = {
      clerkId: id,
      email,
      username: username || `${first_name}_${last_name}`.toLowerCase(),
      firstName: first_name || "",
      lastName: last_name || "",
      photo: image_url,
    };

    const newUser = await createUser(user);

    if (newUser) {
      await clerkClient.users.updateUserMetadata(id, {
        publicMetadata: {
          userId: newUser._id.toString(), // Ensure string conversion for MongoDB ID
        },
      });
    }

    return NextResponse.json({ message: "OK", user: newUser });
  }

  // User updated handler
  if (eventType === "user.updated") {
    const { id, image_url, first_name, last_name, username } = evt.data;

    const user = {
      firstName: first_name || "",
      lastName: last_name || "",
      username: username || "",
      photo: image_url,
    };

    const updatedUser = await updateUser(id, user);
    return NextResponse.json({ message: "OK", user: updatedUser });
  }

  // User deleted handler
  if (eventType === "user.deleted") {
    const { id } = evt.data;
    const deletedUser = await deleteUser(id!);
    return NextResponse.json({ message: "OK", user: deletedUser });
  }

  console.log(`Unhandled event type: ${eventType} with ID: ${id}`);
  return new Response("", { status: 200 });
}