"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { VideoCreator } from "./VideoCreator";
import { MusicCreator } from "./MusicCreator";
import { VoiceCreator } from "./VoiceCreator";

const TAB_IDS = ["video", "music", "voice"] as const;
const TAB_ICONS: Record<(typeof TAB_IDS)[number], string> = { video: "🎬", music: "🎵", voice: "🎤" };

type TabId = (typeof TAB_IDS)[number];

export function StudioTabs(): React.ReactElement {
  const t = useTranslations("studio.tabs");
  const [activeTab, setActiveTab] = useState<TabId>("video");

  const TABS = TAB_IDS.map((id) => ({ id, label: t(`${id}.label`), icon: TAB_ICONS[id], description: t(`${id}.description`) }));

  return (
    <div>
      <div className="mb-6 flex gap-2 overflow-x-auto pb-2" role="tablist">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex shrink-0 items-center gap-2 rounded-xl border px-5 py-3 text-sm font-medium transition-all ${
              activeTab === tab.id
                ? "border-cyan-500/40 bg-gradient-to-r from-cyan-500/25 to-blue-500/20 text-white shadow-lg shadow-cyan-950/40 ring-1 ring-cyan-400/30"
                : "border-white/10 bg-black/40 text-neutral-300 backdrop-blur-md hover:border-white/20 hover:bg-black/55 hover:text-white"
            }`}
          >
            <span className="text-xl">{tab.icon}</span>
            <div className="text-right">
              <div>{tab.label}</div>
              <div className="text-xs text-neutral-500">{tab.description}</div>
            </div>
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/45 p-6 shadow-xl shadow-black/40 backdrop-blur-xl">
        {activeTab === "video" && <VideoCreator />}
        {activeTab === "music" && <MusicCreator />}
        {activeTab === "voice" && <VoiceCreator />}
      </div>
    </div>
  );
}
