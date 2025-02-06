/* eslint-disable camelcase */
import { clerkClient } from "@clerk/nextjs/server";
import type { UserWebhookEvent } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { Webhook } from "svix";

import { createUser, deleteUser, updateUser } from "@/lib/actions/user.actions";

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    throw new Error("WEBHOOK_SECRET is required in .env.local");
  }

  // Get headers
  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Missing Svix headers", { status: 400 });
  }

  // Verify webhook
  const payload = await req.json();
  const body = JSON.stringify(payload);
  const wh = new Webhook(WEBHOOK_SECRET);
  let evt: UserWebhookEvent;

  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as UserWebhookEvent;
  } catch (err) {
    console.error("Webhook verification failed:", err);
    return new Response("Invalid signature", { status: 401 });
  }

  // Handle events
  switch (evt.type) {
    case "user.created": {
      const { id, email_addresses, image_url, first_name, last_name, username } = evt.data;

      const userData = {
        clerkId: id,
        email: email_addresses[0]?.email_address || "",
        username: username || `${first_name}_${last_name}`.toLowerCase().replace(/\s+/g, ""),
        firstName: first_name || "",
        lastName: last_name || "",
        photo: image_url,
      };

      const newUser = await createUser(userData);

      if (newUser) {
        // Get the Clerk client instance first
        const clerk = await clerkClient();
        await clerk.users.updateUserMetadata(id, {
          publicMetadata: {
            userId: newUser._id.toString(),
          },
        });
      }

      return NextResponse.json({ success: true, user: newUser });
    }

    case "user.updated": {
      const { id, image_url, first_name, last_name, username } = evt.data;

      const updateData = {
        firstName: first_name || "",
        lastName: last_name || "",
        username: username || "",
        photo: image_url,
      };

      const updatedUser = await updateUser(id, updateData);
      return NextResponse.json({ success: true, user: updatedUser });
    }

    case "user.deleted": {
      const { id } = evt.data;
      
      if (!id) {
        return NextResponse.json({ error: "User ID is required" }, { status: 400 });
      }

      const deletedUser = await deleteUser(id);
      return NextResponse.json({ success: true, user: deletedUser });
    }

    default:
      return NextResponse.json({ error: "Unsupported event type" }, { status: 400 });
  }
}