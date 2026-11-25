"use client";
import { useEffect } from "react";
import { markOwner } from "@/lib/visits/client";

// Signing in to the admin on a device marks its browser as yours, so your own
// visits to the site from it stay out of the visitor log (like ?me=1).
export default function MarkOwner() {
  useEffect(() => markOwner(), []);
  return null;
}
