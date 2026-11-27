"use client";

import { cn } from "cn";
import { BellRing, Check, ExternalLink } from "lucide-react";
import { useState, useTransition } from "react";

import { setNotificationTopic, startChannelLink, unlinkChannel } from "@/app/(app)/actions";
import type { ChannelSetting, NotificationSettings } from "@/server/notifications/settings";
import type { Topic } from "@/server/notifications/types";

const TOPICS: { id: Topic; label: string; help: string }[] = [
  { id: "trades", label: "Mis ofertas y tratos", help: "Ofertas nuevas, contraofertas y tratos cerrados." },
  { id: "wanted", label: "Cartas que busco", help: "Cuando llega a la mesa una carta de tu lista." },
];

/** "Avisos" in Tu cuenta: link channels and choose topics. */
export function NotificationsSection({ settings }: { settings: NotificationSettings }) {
  const anyLinked = settings.channels.some((c) => c.linked);
  return (
    <section aria-labelledby="notifications-title" className="flex flex-col gap-3 border-t border-[#dccba6] pt-3.5">
      <h3 id="notifications-title" className="flex items-center gap-2 text-[15px] font-bold">
        <BellRing className="size-[18px]" />
        Avisos
      </h3>
      {settings.channels.map((channel) => (
        // Keyed by link state: a fresh row (no stale link) after (dis)connecting.
        <ChannelRow key={`${channel.id}-${channel.linked}`} channel={channel} />
      ))}
      {anyLinked && (
        <div className="flex flex-col gap-2.5">
          {TOPICS.map((t) => (
            <TopicSwitch key={t.id} topic={t} enabled={settings.topics[t.id]} />
          ))}
        </div>
      )}
    </section>
  );
}

function ChannelRow({ channel }: { channel: ChannelSetting }) {
  const [pending, start] = useTransition();
  const [link, setLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (channel.linked) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl bg-panel px-3.5 py-2.5">
        <span className="flex items-center gap-2 text-sm font-semibold text-ok">
          <Check className="size-[18px]" strokeWidth={2.6} />
          {channel.label} conectado
        </span>
        <button
          type="button"
          disabled={pending}
          onClick={() => start(() => unlinkChannel(channel.id))}
          className="text-sm font-bold text-danger disabled:opacity-60"
        >
          Desconectar
        </button>
      </div>
    );
  }

  if (link) {
    return (
      <div className="flex flex-col gap-2 rounded-xl bg-panel px-3.5 py-3">
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-11 items-center justify-center gap-2 rounded-[10px] bg-table text-[15px] font-extrabold text-parchment"
        >
          Abrir {channel.label}
          <ExternalLink className="size-4" />
        </a>
        <p className="text-[13px] leading-normal text-muted-ink">
          En {channel.label}, pulsa «Iniciar». Al volver aquí verás que está conectado. El
          enlace caduca en 15 minutos.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-[13px] leading-normal text-muted-ink">
        Recibe por {channel.label} un mensaje cuando te toque responder o llegue una carta
        que buscas. Nadie sabrá que eres tú.
      </p>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const result = await startChannelLink(channel.id);
            if (result.url) setLink(result.url);
            else setError(result.error ?? "No se ha podido conectar. Inténtalo de nuevo.");
          })
        }
        className="h-11 self-start rounded-[10px] bg-table px-4.5 text-[15px] font-extrabold text-parchment disabled:opacity-60"
      >
        {pending ? "Preparando…" : `Conectar ${channel.label}`}
      </button>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

function TopicSwitch({ topic, enabled }: { topic: (typeof TOPICS)[number]; enabled: boolean }) {
  const [pending, start] = useTransition();
  const id = `topic-${topic.id}`;
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start justify-between gap-3">
      <span className="flex flex-col gap-0.5">
        <span className="text-sm font-semibold">{topic.label}</span>
        <span className="text-[13px] leading-snug text-muted-ink">{topic.help}</span>
      </span>
      <input
        id={id}
        type="checkbox"
        role="switch"
        checked={enabled}
        disabled={pending}
        onChange={(e) => {
          const next = e.target.checked;
          start(() => setNotificationTopic(topic.id, next));
        }}
        className={cn(
          "relative mt-0.5 h-6 w-11 shrink-0 cursor-pointer appearance-none rounded-full bg-field transition-colors",
          "checked:bg-ok disabled:opacity-60",
          "after:absolute after:top-0.5 after:left-0.5 after:size-5 after:rounded-full after:bg-panel after:transition-transform after:content-['']",
          "checked:after:translate-x-5",
        )}
      />
    </label>
  );
}
