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
    <div className="w-full min-w-0">
      <div
        className="mb-3 grid grid-cols-3 gap-1.5 rounded-lg border border-white/15 bg-black/60 p-1.5 backdrop-blur-xl sm:mb-4 sm:gap-2 sm:rounded-xl sm:p-2"
        role="tablist"
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex min-w-0 flex-col items-center gap-1 rounded-md px-1.5 py-2 text-center transition-all sm:flex-row sm:gap-2 sm:px-3 sm:py-2.5 sm:text-right ${
              activeTab === tab.id
                ? "bg-gradient-to-r from-cyan-600/90 to-blue-600/90 text-white shadow-md ring-1 ring-cyan-400/60"
                : "bg-black/45 text-neutral-100 hover:bg-black/60"
            }`}
          >
            <span className="shrink-0 text-lg sm:text-xl">{tab.icon}</span>
            <div className="min-w-0 w-full sm:w-auto">
              <div className="truncate text-[11px] font-semibold leading-tight sm:text-sm">{tab.label}</div>
              <div
                className={`hidden truncate text-[10px] leading-tight sm:block sm:text-xs ${
                  activeTab === tab.id ? "text-cyan-100/90" : "text-neutral-300"
                }`}
              >
                {tab.description}
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="w-full min-w-0 rounded-lg border border-white/15 bg-black/60 p-3 backdrop-blur-xl sm:rounded-xl sm:p-5 md:p-6">
        {activeTab === "video" && <VideoCreator />}
        {activeTab === "music" && <MusicCreator />}
        {activeTab === "voice" && <VoiceCreator />}
      </div>
    </div>
  );
}
