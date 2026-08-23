const nodemailer = require('nodemailer');

function createTransporter() {
  const transporterConfig = process.env.SMTP_HOST && process.env.SMTP_HOST !== 'smtp.gmail.com'
    ? {
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 465),
        secure: String(process.env.SMTP_SECURE || 'true') === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      }
    : {
        service: 'gmail',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      };
  return nodemailer.createTransport(transporterConfig);
}

const getFrom = () => `"${process.env.FROM_NAME || 'Editing Universe'}" <${process.env.SMTP_USER || 'mohdsinan707@gmail.com'}>`;

// ===== Shared email wrapper =====
function wrapper(innerHtml) {
  return `
  <div style="background:#0a0a1a;padding:40px 16px;font-family:'Segoe UI','Inter',Helvetica,Arial,sans-serif;">
    <div style="max-width:540px;margin:0 auto;background:#111127;border-radius:20px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.5);">
      <!-- Header bar -->
      <div style="background:linear-gradient(135deg,#6366f1,#a855f7);padding:32px 36px;">
        <div style="font-size:32px;margin-bottom:6px;">🎬✂️</div>
        <div style="color:#fff;font-size:22px;font-weight:700;letter-spacing:-.3px;">Editing Universe</div>
        <div style="color:rgba(255,255,255,.7);font-size:13px;margin-top:4px;">Professional Video Editing</div>
      </div>
      <!-- Body -->
      <div style="padding:32px 36px;color:#e2e8f0;line-height:1.7;">
        ${innerHtml}
      </div>
      <!-- Footer -->
      <div style="padding:20px 36px;background:rgba(255,255,255,.03);border-top:1px solid rgba(255,255,255,.06);color:#64748b;font-size:12px;text-align:center;">
        You're receiving this because you requested a video edit with Editing Universe.
        <br/>Reply to this email with any questions.
      </div>
    </div>
  </div>`;
}

// ===== 1. Acknowledgement email — sent when request is created =====
async function sendAcknowledgement({ to, name, videoType, position, etaHours }) {
  const eta = etaHours ? `~${etaHours} hour${etaHours === 1 ? '' : 's'}` : 'soon';
  const html = wrapper(`
    <h2 style="margin:0 0 16px;color:#fff;font-size:22px;">Hey ${escapeHtml(name)} 👋</h2>
    <p style="margin:0 0 20px;color:#cbd5e1;">
      Your request has been received! Your <strong style="color:#a5b4fc;">${escapeHtml(videoType)}</strong> video has been added to the editing queue.
    </p>
    <!-- Queue position card -->
    <div style="background:linear-gradient(135deg,rgba(99,102,241,.15),rgba(168,85,247,.15));border:1px solid rgba(99,102,241,.2);border-radius:16px;padding:24px;text-align:center;margin:0 0 24px;">
      <div style="font-size:12px;color:#a5b4fc;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Your Queue Position</div>
      <div style="font-size:48px;font-weight:900;color:#fff;margin:8px 0;">#${position}</div>
      <div style="font-size:14px;color:#a5b4fc;">Estimated wait: ${eta}</div>
    </div>
    <p style="margin:0 0 8px;color:#cbd5e1;">
      We'll email you when editing starts and again when your video is ready — you'll also get to rate the result! 🎉
    </p>
    <p style="margin:0;color:#64748b;font-size:14px;">Thanks for your patience!</p>
  `);
  await createTransporter().sendMail({
    from: getFrom(),
    to,
    subject: `✅ Request received — you're #${position} in the editing queue`,
    html,
  });
}

// ===== 2. Started email — sent when admin clicks "Start" =====
async function sendStarted({ to, name, videoType }) {
  const html = wrapper(`
    <h2 style="margin:0 0 16px;color:#fff;font-size:22px;">Great news, ${escapeHtml(name)}! 🔥</h2>
    <p style="margin:0 0 20px;color:#cbd5e1;">
      Your <strong style="color:#fbbf24;">${escapeHtml(videoType)}</strong> video editing has just started!
    </p>
    <!-- Status card -->
    <div style="background:linear-gradient(135deg,rgba(245,158,11,.12),rgba(251,191,36,.12));border:1px solid rgba(245,158,11,.25);border-radius:16px;padding:24px;text-align:center;margin:0 0 24px;">
      <div style="font-size:40px;margin-bottom:8px;">🎬</div>
      <div style="font-size:16px;font-weight:700;color:#fbbf24;">VIDEO EDITING IN PROGRESS</div>
      <div style="font-size:13px;color:#fcd34d;margin-top:6px;">We're working on your video right now</div>
    </div>
    <p style="margin:0 0 8px;color:#cbd5e1;">
      Sit tight — we'll send you another email the moment your video is ready for delivery. 🚀
    </p>
    <p style="margin:0;color:#64748b;font-size:14px;">Almost there!</p>
  `);
  await createTransporter().sendMail({
    from: getFrom(),
    to,
    subject: `🔥 Your ${videoType} video editing has started!`,
    html,
  });
}

// ===== 3. Completion email — sent when admin clicks "Finish" =====
async function sendCompletion({ to, name, videoType, ratingLinkBase }) {
  const mk = (score, emoji, label) =>
    `<a href="${ratingLinkBase}&score=${score}" style="text-decoration:none;display:inline-block;margin:0 10px;text-align:center;">
       <div style="font-size:40px;line-height:1;">${emoji}</div>
       <div style="font-size:12px;color:#94a3b8;margin-top:6px;">${label}</div>
     </a>`;
  const html = wrapper(`
    <h2 style="margin:0 0 16px;color:#fff;font-size:22px;">All done, ${escapeHtml(name)}! 🎉</h2>
    <p style="margin:0 0 20px;color:#cbd5e1;">
      Your <strong style="color:#6ee7b7;">${escapeHtml(videoType)}</strong> video has been professionally edited and delivered.
    </p>
    <!-- Completion card -->
    <div style="background:linear-gradient(135deg,rgba(16,185,129,.12),rgba(110,231,183,.12));border:1px solid rgba(16,185,129,.25);border-radius:16px;padding:24px;text-align:center;margin:0 0 24px;">
      <div style="font-size:40px;margin-bottom:8px;">✅</div>
      <div style="font-size:16px;font-weight:700;color:#6ee7b7;">VIDEO DELIVERED</div>
    </div>
    <p style="margin:0 0 16px;color:#cbd5e1;font-weight:600;text-align:center;">How did it turn out?</p>
    <div style="text-align:center;margin:0 0 24px;">
      ${mk(1, '😐', "It's okay")}
      ${mk(2, '😃', 'Good')}
      ${mk(3, '🤩', 'Loved it!')}
    </div>
    <p style="margin:0;color:#64748b;font-size:13px;text-align:center;">
      Tap an emoji to send your rating — takes one second.<br/>Thanks for trusting Editing Universe with your video! 💜
    </p>
  `);
  await createTransporter().sendMail({
    from: getFrom(),
    to,
    subject: `🎉 Your ${videoType} video is ready!`,
    html,
  });
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

module.exports = { sendAcknowledgement, sendStarted, sendCompletion };
