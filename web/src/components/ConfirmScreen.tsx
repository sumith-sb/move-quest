interface Props {
  email?: string | null
  onBack: () => void
}

export function ConfirmScreen({ email, onBack }: Props) {
  return (
    <section className="screen onboarding-screen" aria-labelledby="confirm-title">
      <p className="eyebrow">Check your inbox</p>
      <h1 id="confirm-title">Confirm your email</h1>
      <p className="lede">
        We sent a confirmation link
        {email ? ` to ${email}` : ''}. Open it to activate your Move Quest account,
        then come back and sign in with the password you chose.
      </p>
      <p className="muted">
        Don&apos;t remember your password? Use Forgot password on the sign-in screen
        after confirming — you&apos;ll get a link to set a new one.
      </p>
      <button type="button" className="primary-btn" onClick={onBack}>
        Back to sign in
      </button>
    </section>
  )
}
