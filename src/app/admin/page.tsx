"use client";

import { useState, useEffect } from "react";

interface Lead {
  id: string;
  email: string;
  instagram_username: string | null;
  score: number;
  ig_followers: number | null;
  ig_engagement_rate: number | null;
  created_at: string;
}

const ADMIN_KEY = "ktr2026";

export default function AdminPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState<string | null>(null);
  const [sent, setSent] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/assessment-lead?key=${ADMIN_KEY}`)
      .then((r) => r.json())
      .then((data) => {
        setLeads(data.leads || []);
        setLoading(false);
      })
      .catch(() => {
        setError("Kon leads niet laden");
        setLoading(false);
      });
  }, []);

  const sendReport = async (leadId: string) => {
    setSending(leadId);
    try {
      const res = await fetch(`/api/send-report?key=${ADMIN_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId }),
      });
      const data = await res.json();
      if (data.success) {
        setSent((prev) => new Set([...prev, leadId]));
      } else {
        alert(`Fout: ${data.error}`);
      }
    } catch {
      alert("Versturen mislukt");
    }
    setSending(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#060606] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#060606] text-[#F5F0EB] p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Assessment Leads</h1>
            <p className="text-sm text-[#B5ADA6] mt-1">
              {leads.length} lead{leads.length !== 1 ? "s" : ""} totaal
            </p>
          </div>
          <a
            href="/"
            className="text-sm text-[#B5ADA6] hover:text-orange-500 transition-colors"
          >
            Terug naar site
          </a>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6 text-red-400 text-sm">
            {error}
          </div>
        )}

        {leads.length === 0 ? (
          <div className="bg-[#0C0C0C] border border-[#181818] rounded-xl p-12 text-center">
            <p className="text-[#B5ADA6]">Nog geen leads. Deel de assessment link!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {leads.map((lead) => (
              <div
                key={lead.id}
                className="bg-[#0C0C0C] border border-[#181818] rounded-xl p-5 flex items-center gap-5"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <p className="font-semibold truncate">{lead.email}</p>
                    {lead.instagram_username && (
                      <span className="text-xs text-orange-500">
                        @{lead.instagram_username}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-[#71717a]">
                    <span>Score: {lead.score}/100</span>
                    {lead.ig_followers && (
                      <span>{lead.ig_followers.toLocaleString()} followers</span>
                    )}
                    {lead.ig_engagement_rate && (
                      <span>{lead.ig_engagement_rate}% engagement</span>
                    )}
                    <span>
                      {new Date(lead.created_at).toLocaleDateString("nl-NL", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => sendReport(lead.id)}
                  disabled={sending === lead.id || sent.has(lead.id)}
                  className="px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap"
                  style={{
                    background: sent.has(lead.id)
                      ? "rgba(34,197,94,0.1)"
                      : "rgba(249,115,22,0.1)",
                    border: sent.has(lead.id)
                      ? "1px solid rgba(34,197,94,0.3)"
                      : "1px solid rgba(249,115,22,0.3)",
                    color: sent.has(lead.id) ? "#22c55e" : "#f97316",
                    cursor:
                      sending === lead.id || sent.has(lead.id)
                        ? "not-allowed"
                        : "pointer",
                  }}
                >
                  {sending === lead.id
                    ? "Versturen..."
                    : sent.has(lead.id)
                      ? "Verstuurd"
                      : "Stuur rapport"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
