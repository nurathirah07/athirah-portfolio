"use client";
import { useState } from "react";
import RollText from "@/components/RollText";
import { site } from "@/data/site";

const field =
  "w-full border-b border-cream/30 bg-transparent py-3 outline-none transition-colors placeholder:text-cream/40 focus:border-gold";

// There's no mail server behind this site, so the form drafts the message
// in the visitor's own email app, addressed to you.
export default function ContactForm() {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");

  return (
    <form
      className="flex max-w-lg flex-col gap-6"
      onSubmit={(e) => {
        e.preventDefault();
        const subject = encodeURIComponent(`Portfolio enquiry from ${name}`);
        window.location.href = `mailto:${site.email}?subject=${subject}&body=${encodeURIComponent(message)}`;
      }}
    >
      <label className="block">
        <span className="sr-only">Your name</span>
        <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className={field} />
      </label>
      <label className="block">
        <span className="sr-only">Your message</span>
        <textarea required rows={3} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Tell me about your project" className={`${field} resize-none`} />
      </label>
      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" className="roll-plain btn-gloss rounded-full px-7 py-3 font-accent">
          <RollText>Send message</RollText>
        </button>
        <span className="text-sm text-cream/70 md:text-cream/50">Opens in your email app</span>
      </div>
    </form>
  );
}
