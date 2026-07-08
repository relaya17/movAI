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
      {/* Tab buttons */}
      <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex shrink-0 items-center gap-2 rounded-xl px-5 py-3 text-sm font-medium transition-all ${
              activeTab === tab.id
                ? "bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-white ring-1 ring-cyan-500/50"
                : "bg-white/5 text-neutral-400 hover:bg-white/10 hover:text-white"
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

      {/* Tab content */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
        {activeTab === "video" && <VideoCreator />}
        {activeTab === "music" && <MusicCreator />}
        {activeTab === "voice" && <VoiceCreator />}
      </div>
    </div>
  );
}
