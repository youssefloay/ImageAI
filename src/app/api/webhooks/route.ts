import { clerkClient } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { Webhook } from "svix";
import { WebhookEvent } from "@clerk/nextjs/server";

import { createUser, deleteUser, updateUser } from "@/lib/actions/user.actions";

export async function POST(req: Request) {
  try {
    console.log("Webhook received");
    
    const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;
    if (!WEBHOOK_SECRET) {
      console.error("WEBHOOK_SECRET is missing");
      return NextResponse.json(
        { error: "WEBHOOK_SECRET is missing" },
        { status: 500 }
      );
    }

    // Get the headers
    const headerPayload = await headers();
    const svix_id = headerPayload.get("svix-id");
    const svix_timestamp = headerPayload.get("svix-timestamp");
    const svix_signature = headerPayload.get("svix-signature");

    // If there are no headers, error out
    if (!svix_id || !svix_timestamp || !svix_signature) {
      console.error("Missing svix headers");
      return NextResponse.json(
        { error: "Missing svix headers" },
        { status: 400 }
      );
    }

    // Get the body
    const payload = await req.json();
    console.log("Webhook payload:", payload);

    // Create a new Svix instance with your secret
    const wh = new Webhook(WEBHOOK_SECRET);

    let evt: WebhookEvent;

    try {
      evt = wh.verify(JSON.stringify(payload), {
        "svix-id": svix_id,
        "svix-timestamp": svix_timestamp,
        "svix-signature": svix_signature,
      }) as WebhookEvent;
    } catch (err) {
      console.error("Error verifying webhook:", err);
      return NextResponse.json(
        { error: "Error verifying webhook" },
        { status: 400 }
      );
    }

    // Handle the webhook
    const { type } = evt;
    console.log("Webhook type:", type);

    switch (type) {
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
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}