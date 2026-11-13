"use client";

import { useActionState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { loginAction, signupAction } from "@/server/actions/auth";
import { IND_KEYS } from "@/lib/industries";
import type { FormState } from "@/server/validate";

const init: FormState = {};

export function LoginForm() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const [state, action, pending] = useActionState(loginAction, init);
  return (
    <form action={action} className="form" noValidate>
      <input type="hidden" name="locale" value={locale} />
      {state.error && <div className="form-err" role="alert">{t(state.error)}</div>}
      <label className="fld">{t("email")}<input name="email" type="email" autoComplete="email" required defaultValue={state.values?.email} autoFocus /></label>
      <label className="fld">{t("password")}<input name="password" type="password" autoComplete="current-password" required /></label>
      <button className="btn btn-acc wide" disabled={pending}>{pending ? t("pending") : t("login_btn")}</button>
    </form>
  );
}

export function SignupForm() {
  const t = useTranslations("auth");
  const ti = useTranslations("industries");
  const locale = useLocale();
  const [state, action, pending] = useActionState(signupAction, init);
  const v = state.values ?? {};
  return (
    <form action={action} className="form" noValidate>
      <input type="hidden" name="locale" value={locale} />
      {state.error && <div className="form-err" role="alert">{t(state.error)}</div>}
      <div className="fld-row">
        <label className="fld">{t("name")}<input name="name" autoComplete="name" required minLength={2} maxLength={60} defaultValue={v.name} autoFocus /></label>
        <label className="fld">{t("business")}<input name="business" autoComplete="organization" required minLength={2} maxLength={80} defaultValue={v.business} /></label>
      </div>
      <label className="fld">{t("industry")}
        <select name="industry" defaultValue={v.industry || "service"}>
          {IND_KEYS.map(k => <option key={k} value={k}>{ti(`${k}.name`)}</option>)}
        </select>
      </label>
      <label className="fld">{t("email")}<input name="email" type="email" autoComplete="email" required defaultValue={v.email} /></label>
      <label className="fld">{t("password")}<input name="password" type="password" autoComplete="new-password" required minLength={8} /><small>{t("password_hint")}</small></label>
      <label className="terms-chk">
        <input type="checkbox" name="terms" required />
        <span>{t.rich("terms_agree", {
          terms: c => <Link href="/terms" target="_blank">{c}</Link>,
          privacy: c => <Link href="/privacy" target="_blank">{c}</Link>
        })}</span>
      </label>
      <button className="btn btn-acc wide" disabled={pending}>{pending ? t("pending") : t("signup_btn")}</button>
    </form>
  );
}
