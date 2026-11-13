import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { LangLinks } from "@/components/app/AppChrome";
import { ApiKeyForm, ChannelsForm, DeleteAccountForm, ProfileForm, SecurityForms, SlackForm, TelegramForm, WebhookForm } from "@/components/app/SettingsForms";
import { getCurrentUser } from "@/server/auth";
import { webhookSecret } from "@/server/crypto";
import { countSessions, getIntegrations } from "@/server/repo";

// reads the session cookie on every request
export const dynamic = "force-dynamic";

const Badge = ({ on, label }: { on: boolean; label: string }) => <span className={`mode-tag ${on ? "live" : ""}`}>{label}</span>;

export default async function SettingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  const user = (await getCurrentUser())!;
  const t = await getTranslations("app");
  const [integ, sessions] = await Promise.all([getIntegrations(user.id), countSessions(user.id)]);
  const tgOn = !!(integ.telegramToken && integ.telegramChatId);
  const state = (on: boolean) => <Badge on={on} label={t(on ? "connected" : "not_connected")} />;
  // stored secrets never go back to the browser — only a masked hint
  const mask = (url: string | null) => (url ? url.replace(/^(https?:\/\/[^/]+\/).*(.{4})$/, "$1…$2") : "");

  return (
    <>
      <div className="app-head">
        <div><h1>{t("settings")}</h1><p>{user.email}</p></div>
        <LangLinks />
      </div>
      <div className="settings">
        <div className="app-stack">
          <div className="card-w"><h3>{t("profile")}</h3>
            <ProfileForm name={user.name} business={user.business} industry={user.industry} prefLocale={user.locale} />
          </div>
          <div className="card-w"><h3>{t("channels")}</h3><p className="sub">{t("channels_sub")}</p>
            <ChannelsForm channels={integ.channels} />
          </div>
          <div className="card-w"><h3>{t("api_key")}</h3><p className="sub">{t("api_key_sub")}</p>
            <ApiKeyForm publicKey={user.publicKey} />
          </div>
          <div className="card-w"><h3>{t("security")}</h3>
            <SecurityForms sessions={sessions} />
          </div>
        </div>
        <div className="app-stack">
          <div className="card-w"><h3>Slack{state(!!integ.slackWebhook)}</h3>
            <p className="sub">{t("slack_sub")}</p>
            <SlackForm current={mask(integ.slackWebhook)} />
          </div>
          <div className="card-w"><h3>{t("webhook")}{state(!!integ.webhookUrl)}</h3>
            <p className="sub">{t("webhook_sub")}</p>
            <WebhookForm current={mask(integ.webhookUrl)} secret={webhookSecret(user.id)} />
          </div>
          <div className="card-w"><h3>{t("telegram")}{state(tgOn)}</h3>
            <p className="sub">{t("telegram_sub")}</p>
            <TelegramForm hasToken={!!integ.telegramToken} chatId={integ.telegramChatId ?? ""} />
          </div>
          <div className="card-w danger-card"><h3>{t("danger")}</h3><p className="sub">{t("delete_sub")}</p>
            <DeleteAccountForm email={user.email} />
          </div>
        </div>
      </div>
    </>
  );
}
