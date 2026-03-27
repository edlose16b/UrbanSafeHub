import type { Dictionary } from "../i18n/get-dictionary";

type OgImageTemplateProps = {
  dictionary: Dictionary;
  title: string;
  description: string;
  profileLabel: string | null;
  scoreLabel: string | null;
  isZonePreview: boolean;
};

export function OgImageTemplate({
  dictionary,
  title,
  description,
  profileLabel,
  scoreLabel,
  isZonePreview,
}: OgImageTemplateProps) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background:
          "linear-gradient(135deg, #08131f 0%, #0f2336 42%, #163d5a 100%)",
        color: "#f8fafc",
        padding: "48px",
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "14px",
          }}
        >
          <div
            style={{
              width: "18px",
              height: "18px",
              borderRadius: "999px",
              background: "#4ade80",
              boxShadow: "0 0 0 10px rgba(74, 222, 128, 0.18)",
            }}
          />
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "4px",
            }}
          >
            <span
              style={{
                fontSize: "22px",
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              {dictionary.metadata.title}
            </span>
            <span
              style={{
                fontSize: "18px",
                color: "#cbd5e1",
              }}
            >
              {dictionary.metadata.share.badge}
            </span>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            border: "1px solid rgba(255,255,255,0.18)",
            borderRadius: "999px",
            padding: "12px 18px",
            fontSize: "20px",
            color: "#e2e8f0",
            background: "rgba(8, 19, 31, 0.24)",
          }}
        >
          {isZonePreview
            ? dictionary.metadata.share.zoneBadge
            : dictionary.metadata.share.mapBadge}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "18px",
          maxWidth: "980px",
        }}
      >
        <div
          style={{
            fontSize: isZonePreview ? "64px" : "70px",
            lineHeight: 1.05,
            fontWeight: 800,
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: "28px",
            lineHeight: 1.35,
            color: "#dbeafe",
            maxWidth: "920px",
          }}
        >
          {description}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: "18px",
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            minWidth: "250px",
            padding: "20px 24px",
            borderRadius: "24px",
            background: "rgba(255,255,255,0.1)",
            border: "1px solid rgba(255,255,255,0.12)",
          }}
        >
          <span style={{ fontSize: "18px", color: "#cbd5e1" }}>
            {dictionary.metadata.share.communitySignalLabel}
          </span>
          <span style={{ fontSize: "34px", fontWeight: 700 }}>
            {scoreLabel ?? dictionary.metadata.share.communitySignalFallback}
          </span>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            minWidth: "320px",
            padding: "20px 24px",
            borderRadius: "24px",
            background: "rgba(255,255,255,0.1)",
            border: "1px solid rgba(255,255,255,0.12)",
          }}
        >
          <span style={{ fontSize: "18px", color: "#cbd5e1" }}>
            {dictionary.metadata.share.profileLabel}
          </span>
          <span style={{ fontSize: "28px", fontWeight: 700 }}>
            {profileLabel ?? dictionary.metadata.share.profileFallback}
          </span>
        </div>
      </div>
    </div>
  );
}
