"use client";

import { useActionState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { routing } from "@/i18n/routing";
import { IND_KEYS } from "@/lib/industries";
import { CHANNEL_KEYS, CHANNEL_NAMES, type Channels, type IndKey } from "@/lib/types";
import * as A from "@/server/actions/app";
import type { FormState } from "@/server/validate";
import { Copy } from "./AppChrome";

const init: FormState = {};
const LANG_NAME: Record<string, string> = { en: "English", ru: "Русский", uz: "O'zbekcha" };

function Msg({ s }: { s: FormState }) {
  const t = useTranslations("app");
  const ta = useTranslations("auth");
  if (!s.error && !s.ok) return null;
  const key = (s.error ?? s.ok)!;
  const text = t.has(key) ? t(key, s.params ?? {}) : ta(key);
  return <div className={`amsg ${s.error ? "err" : "ok"}`} role="status">{text}</div>;
}

export function ProfileForm({ name, business, industry, prefLocale }: { name: string; business: string; industry: IndKey; prefLocale: string }) {
  const t = useTranslations("app");
  const ta = useTranslations("auth");
  const ti = useTranslations("industries");
  const [s, action, pending] = useActionState(A.updateProfileAction, init);
  return (
    <form action={action} className="aform">
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <label className="afld">{ta("name")}<input name="name" defaultValue={name} required maxLength={60} /></label>
        <label className="afld">{ta("business")}<input name="business" defaultValue={business} required maxLength={80} /></label>
      </div>
      <label className="afld">{ta("industry")}
        <select name="industry" defaultValue={industry}>{IND_KEYS.map(k => <option key={k} value={k}>{ti(`${k}.name`)}</option>)}</select>
      </label>
      <label className="afld">{t("language")}
        <select name="locale" defaultValue={prefLocale}>{routing.locales.map(l => <option key={l} value={l}>{LANG_NAME[l]}</option>)}</select>
      </label>
      <Msg s={s} />
      <div className="arow"><button className="abtn" disabled={pending}>{t("save")}</button></div>
    </form>
  );
}

/** Save + remove + "send test" for one channel. */
function ChannelCard({ save, test, connected, children }: {
  save: (p: FormState, fd: FormData) => Promise<FormState>;
  test: (p: FormState) => Promise<FormState>;
  connected: boolean;
  children: React.ReactNode;
}) {
  const t = useTranslations("app");
  const [s, saveAction, saving] = useActionState(save, init);
  const [ts, testAction, testing] = useActionState(test, init);
  return (
    <div className="aform">
      <form action={saveAction} className="aform">
        {children}
        <Msg s={s} />
        <div className="arow">
          <button className="abtn" disabled={saving}>{t("save")}</button>
          {connected && <button className="abtn ghost" name="remove" value="1" disabled={saving}>{t("remove")}</button>}
        </div>
      </form>
      {connected && (
        <form action={testAction} className="aform">
          <Msg s={ts} />
          <div className="arow"><button className="abtn acc" disabled={testing}>✈ {t("send_test")}</button></div>
        </form>
      )}
    </div>
  );
}

export function TelegramForm({ hasToken, chatId }: { hasToken: boolean; chatId: string }) {
  const t = useTranslations("app");
  return (
    <ChannelCard save={A.saveTelegramAction} test={A.testTelegramAction} connected={hasToken && !!chatId}>
      <label className="afld">{t("tg_token")}
        <input name="token" type="password" autoComplete="off" placeholder={hasToken ? "••••••••••••••••••••" : "123456789:AA…"} />
        {hasToken && <small>{t("secret_set")}</small>}
      </label>
      <label className="afld">{t("tg_chat")}<input name="chatId" defaultValue={chatId} placeholder="123456789" autoComplete="off" /></label>
    </ChannelCard>
  );
}

export function SlackForm({ current }: { current: string }) {
  const t = useTranslations("app");
  return (
    <ChannelCard save={A.saveSlackAction} test={A.testSlackAction} connected={!!current}>
      <label className="afld">{t("slack_url")}
        <input name="slack" type="password" autoComplete="off" placeholder={current || "https://hooks.slack.com/services/…"} />
        {current && <small>{t("secret_set")}</small>}
      </label>
    </ChannelCard>
  );
}

export function WebhookForm({ current, secret }: { current: string; secret: string }) {
  const t = useTranslations("app");
  return (
    <ChannelCard save={A.saveWebhookAction} test={A.testWebhookAction} connected={!!current}>
      <label className="afld">{t("webhook_url")}
        <input name="webhook" type="url" autoComplete="off" placeholder={current || "https://hooks.zapier.com/hooks/catch/…"} />
        {current && <small>{t("secret_set")}</small>}
      </label>
      <div className="afld">{t("webhook_secret")}
        <div className="keybox"><span style={{ flex: 1 }}>{secret}</span><Copy text={secret}>{t("copy")}</Copy></div>
        <small>{t("webhook_secret_hint")}</small>
      </div>
    </ChannelCard>
  );
}

export function ChannelsForm({ channels }: { channels: Channels }) {
  const t = useTranslations("app");
  const [s, action, pending] = useActionState(A.saveChannelsAction, init);
  return (
    <form action={action} className="aform">
      <div>
        {CHANNEL_KEYS.map(k => (
          <label className="chk" key={k}><span>{CHANNEL_NAMES[k]}</span><input type="checkbox" name={k} defaultChecked={channels[k]} /></label>
        ))}
      </div>
      <Msg s={s} />
      <div className="arow"><button className="abtn" disabled={pending}>{t("save")}</button></div>
    </form>
  );
}

export function ApiKeyForm({ publicKey }: { publicKey: string }) {
  const t = useTranslations("app");
  const [s, action, pending] = useActionState(A.rotateKeyAction, init);
  return (
    <form action={action} className="aform">
      <div className="keybox"><span style={{ flex: 1 }}>{publicKey}</span><Copy text={publicKey}>{t("copy")}</Copy></div>
      <Msg s={s} />
      <div className="arow"><button className="abtn ghost" disabled={pending}>↻ {t("rotate")}</button></div>
    </form>
  );
}

export function SecurityForms({ sessions }: { sessions: number }) {
  const t = useTranslations("app");
  const ta = useTranslations("auth");
  const [s, action, pending] = useActionState(A.changePasswordAction, init);
  const [os, others, outPending] = useActionState(A.logoutOthersAction, init);
  return (
    <div className="aform">
      <form action={action} className="aform">
        <label className="afld">{t("current_pw")}<input name="current" type="password" autoComplete="current-password" required /></label>
        <label className="afld">{t("new_pw")}<input name="next" type="password" autoComplete="new-password" required minLength={8} /><small>{ta("password_hint")}</small></label>
        <Msg s={s} />
        <div className="arow"><button className="abtn" disabled={pending}>{t("change_pw")}</button></div>
      </form>
      <form action={others} className="aform" style={{ borderTop: "1px solid #F0EFE8", paddingTop: 12 }}>
        <div className="arow" style={{ justifyContent: "space-between" }}>
          <span style={{ fontSize: 14 }}>{t("sessions_active", { n: sessions })}</span>
          <button className="abtn ghost" disabled={outPending || sessions < 2}>{t("logout_others")}</button>
        </div>
        <Msg s={os} />
      </form>
    </div>
  );
}

export function DeleteAccountForm({ email }: { email: string }) {
  const t = useTranslations("app");
  const locale = useLocale();
  const [s, action, pending] = useActionState(A.deleteAccountAction, init);
  return (
    <form action={action} className="aform">
      <input type="hidden" name="locale" value={locale} />
      <label className="afld">{t("type_email")}<input name="confirm" placeholder={email} autoComplete="off" /></label>
      <Msg s={s} />
      <div className="arow"><button className="abtn danger" disabled={pending}>{t("delete_btn")}</button></div>
    </form>
  );
}
