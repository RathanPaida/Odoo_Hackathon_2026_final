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
          className="px-2.5 py-1 bg-[rgba(15,15,35,0.8)] border border-[rgba(139,92,246,0.4)] rounded-lg text-xs text-white focus:outline-none focus:border-violet-400 w-36"
          autoFocus
        />
        <button
          onClick={handleSave}
          disabled={saving}
          className="p-1 rounded-md bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30 transition-colors"
          title="Save"
        >
          <Check size={13} />
        </button>
        <button
          onClick={() => {
            setInputValue(phone);
            setEditing(false);
          }}
          className="p-1 rounded-md bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 border border-rose-500/30 transition-colors"
          title="Cancel"
        >
          <X size={13} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 group">
      <p className="font-semibold text-[#f1f5f9] text-sm">
        {phone || <span className="text-[#94a3b8] font-normal italic">Not provided</span>}
      </p>
      <button
        onClick={() => {
          setInputValue(phone || "+91-");
          setEditing(true);
        }}
        className="text-[#a78bfa] opacity-70 hover:opacity-100 hover:text-violet-300 transition-all p-0.5 rounded hover:bg-[rgba(139,92,246,0.15)]"
        title="Edit phone number"
      >
        <Edit2 size={12} />
      </button>
    </div>
  );
}
