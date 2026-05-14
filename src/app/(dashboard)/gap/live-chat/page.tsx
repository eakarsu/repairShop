// === Batch 11 Gaps & Frontend Mounts ===
'use client';
import GapFeaturePage from '@/components/GapFeaturePage';
export default function GapLiveChatPage() {
  return (
    <GapFeaturePage
      title="In-App Live Chat"
      description="In-App Live Chat"
      slug="live-chat"
      aiResultKey="message"
      fields={[{"name":"ticketId","label":"Ticket ID","required":true,"placeholder":""},{"name":"message","label":"Message","type":"textarea","rows":4,"required":false}]}
    />
  );
}
