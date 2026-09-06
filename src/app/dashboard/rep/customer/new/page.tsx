"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  UserPlus, 
  ArrowLeft, 
  Building2, 
  Mail, 
  Phone, 
  MapPin, 
  CreditCard,
  Save,
  AlertCircle,
  CheckCircle2
} from "lucide-react";
import { RoleSidebar } from "@/components/navbar/RoleSidebar";
import s from "./newCustomer.module.css";

export default function NewCustomerPage() {
  const [user, setUser] = useState<{ name: string; email: string; role: any } | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    address: "",
    city: "",
    state: "",
    postalCode: "",
    country: "",
    tier: "SILVER",
    notes: ""
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then(res => res.json())
      .then(body => {
        if (body.success && body.data) {
          setUser(body.data);
        }
      })
      .catch(() => {});
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleTierSelect = (tier: string) => {
    setFormData(prev => ({ ...prev, tier }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const payload = {
        companyName: formData.company || formData.name,
        contactName: formData.name,
        email: formData.email,
        phone: formData.phone || undefined,
        tier: formData.tier,
      };

      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (data.success) {
        setSuccess("Customer created successfully!");
        setFormData({
          name: "",
          email: "",
          phone: "",
          company: "",
          address: "",
          city: "",
          state: "",
          postalCode: "",
          country: "",
          tier: "SILVER",
          notes: ""
        });
      } else {
        setError(data.error?.message || "Failed to create customer");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const tiers = [
    { id: "BRONZE", name: "Bronze", description: "Entry level pricing", icon: "🥉" },
    { id: "SILVER", name: "Silver", description: "Standard benefits", icon: "🥈" },
    { id: "GOLD", name: "Gold", description: "Premium benefits", icon: "🥇" },
    { id: "PLATINUM", name: "Platinum", description: "Maximum discounts", icon: "💎" }
  ];

  return (
    <RoleSidebar role={user?.role || "SALES_REP"} userName={user?.name || "Sales Rep"} userEmail={user?.email || "rep@dealflow.com"}>
      <main className={s.page}>
      <div className={s.container}>
        <div className={`${s.header} ${s.animateFadeIn}`}>
          <div className={s.headerContent}>
            <Link href="/dashboard/rep/customers" className={s.backLink}>
              <ArrowLeft size={16} />
              Back to Customers
            </Link>
            <div className={s.headerIcon}>
              <UserPlus size={14} />
              Customer Management
            </div>
            <h1 className={s.title}>Create New Customer</h1>
            <p className={s.subtitle}>
              Add a new customer to your portfolio. Fill in the details below to create their account.
            </p>
          </div>
        </div>

        {error && (
          <div className={`${s.alert} ${s.alertError}`}>
            <AlertCircle size={18} className={s.alertIcon} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className={`${s.alert} ${s.alertSuccess}`}>
            <CheckCircle2 size={18} className={s.alertIcon} />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className={`${s.card} ${s.animateFadeIn}`} style={{animationDelay: '0.1s'}}>
            <div className={s.sectionTitle}>
              <span className={s.sectionIcon}><Building2 size={18} /></span>
              Basic Information
            </div>

            <div className={s.formGrid}>
              <div className={s.formGroup}>
                <label className={s.formLabel}>Customer Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className={s.formInput}
                  placeholder="Acme Corporation"
                />
              </div>

              <div className={s.formGroup}>
                <label className={s.formLabel}><Mail size={14} style={{display: 'inline', marginRight: '0.375rem'}} />Email Address *</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className={s.formInput}
                  placeholder="contact@acme.com"
                />
              </div>

              <div className={s.formGroup}>
                <label className={s.formLabel}><Phone size={14} style={{display: 'inline', marginRight: '0.375rem'}} />Phone Number</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className={s.formInput}
                  placeholder="+1 (555) 123-4567"
                />
              </div>

              <div className={s.formGroup}>
                <label className={s.formLabel}>Company / Organization</label>
                <input
                  type="text"
                  name="company"
                  value={formData.company}
                  onChange={handleChange}
                  className={s.formInput}
                  placeholder="Acme Inc."
                />
              </div>
            </div>
          </div>

          <div className={`${s.card} ${s.animateFadeIn}`} style={{marginTop: '1.5rem', animationDelay: '0.15s'}}>
            <div className={s.sectionTitle}>
              <span className={s.sectionIcon}><MapPin size={18} /></span>
              Address Details
            </div>

            <div className={s.formGroup}>
              <label className={s.formLabel}>Street Address</label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                className={s.formInput}
                placeholder="123 Business Ave, Suite 400"
              />
            </div>

            <div className={s.formGrid}>
              <div className={s.formGroup}>
                <label className={s.formLabel}>City</label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  className={s.formInput}
                  placeholder="San Francisco"
                />
              </div>

              <div className={s.formGroup}>
                <label className={s.formLabel}>State / Province</label>
                <input
                  type="text"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  className={s.formInput}
                  placeholder="California"
                />
              </div>

              <div className={s.formGroup}>
                <label className={s.formLabel}>Postal / ZIP Code</label>
                <input
                  type="text"
                  name="postalCode"
                  value={formData.postalCode}
                  onChange={handleChange}
                  className={s.formInput}
                  placeholder="94102"
                />
              </div>

              <div className={s.formGroup}>
                <label className={s.formLabel}>Country</label>
                <input
                  type="text"
                  name="country"
                  value={formData.country}
                  onChange={handleChange}
                  className={s.formInput}
                  placeholder="United States"
                />
              </div>
            </div>
          </div>

          <div className={`${s.card} ${s.animateFadeIn}`} style={{marginTop: '1.5rem', animationDelay: '0.2s'}}>
            <div className={s.sectionTitle}>
              <span className={s.sectionIcon}><CreditCard size={18} /></span>
              Customer Tier
            </div>
            <p className={s.subtitle} style={{marginBottom: '1rem'}}>
              Select the customer tier to determine their discount limits and pricing structure.
            </p>

            <div className={s.tierCards}>
              {tiers.map((tier) => (
                <div
                  key={tier.id}
                  className={`${s.tierCard} ${s[`tier${tier.id.charAt(0) + tier.id.slice(1).toLowerCase()}`]} ${formData.tier === tier.id ? s.tierCardSelected : ""}`}
                  onClick={() => handleTierSelect(tier.id)}
                >
                  <div className={s.tierIcon}>{tier.icon}</div>
                  <div className={s.tierName}>{tier.name}</div>
                  <div className={s.tierDescription}>{tier.description}</div>
                </div>
              ))}
            </div>
          </div>

          <div className={`${s.card} ${s.animateFadeIn}`} style={{marginTop: '1.5rem', animationDelay: '0.25s'}}>
            <div className={s.sectionTitle}>
              <span className={s.sectionIcon}><UserPlus size={18} /></span>
              Additional Notes
            </div>

            <div className={s.formGroup}>
              <label className={s.formLabel}>Internal Notes</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                className={s.formTextarea}
                placeholder="Add any additional notes about this customer..."
              />
              <p className={s.formHint}>These notes are only visible to your team.</p>
            </div>
          </div>

          <div className={s.actions}>
            <Link href="/dashboard/rep/customers" className={s.secondaryBtn}>
              Cancel
            </Link>
            <button type="submit" className={s.primaryBtn} disabled={loading}>
              <Save size={16} />
              {loading ? "Creating..." : "Create Customer"}
            </button>
          </div>
        </form>
      </div>
    </main>
    </RoleSidebar>
  );
}
