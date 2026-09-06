"use client";

import { useState } from "react";
import { Phone, Check, Edit2, X } from "lucide-react";
import { useToast } from "@/components/ui";

export function CustomerPhoneEditor({ initialPhone }: { initialPhone?: string | null }) {
  const toast = useToast();
  const [phone, setPhone] = useState(initialPhone || "");
  const [editing, setEditing] = useState(false);
  const [inputValue, setInputValue] = useState(initialPhone || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!inputValue.trim()) {
      toast.warning("Empty phone number", "Please enter a valid phone number.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/customer/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: inputValue.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Failed to update phone number");
      }
      setPhone(data.data.phone);
      setEditing(false);
      toast.success("Phone updated", "Your phone number has been saved.");
    } catch (err: any) {
      toast.error("Error", err.message);
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1.5 mt-0.5">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="+91-9876543210"
          className="px-2.5 py-1 bg-[rgba(0,0,0,0.8)] border border-[rgba(255,255,255,0.25)] rounded-lg text-xs text-white focus:outline-none focus:border-white w-36"
          autoFocus
        />
        <button
          onClick={handleSave}
          disabled={saving}
          className="p-1 rounded-md bg-white text-black hover:bg-[#e0e0e0] transition-colors"
          title="Save"
        >
          <Check size={13} />
        </button>
        <button
          onClick={() => {
            setInputValue(phone);
            setEditing(false);
          }}
          className="p-1 rounded-md bg-[rgba(255,255,255,0.1)] text-white hover:bg-[rgba(255,255,255,0.2)] border border-[rgba(255,255,255,0.15)] transition-colors"
          title="Cancel"
        >
          <X size={13} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 group">
      <p className="font-semibold text-white text-sm">
        {phone || <span className="text-[#888888] font-normal italic">Not provided</span>}
      </p>
      <button
        onClick={() => {
          setInputValue(phone || "+91-");
          setEditing(true);
        }}
        className="text-[#cccccc] opacity-70 hover:opacity-100 hover:text-white transition-all p-0.5 rounded hover:bg-[rgba(255,255,255,0.1)]"
        title="Edit phone number"
      >
        <Edit2 size={12} />
      </button>
    </div>
  );
}
