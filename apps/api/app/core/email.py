"""Transactional email for account verification and password recovery.

Messages are sent after the HTTP response (FastAPI background tasks), so a slow or
failing mail server never delays a request and response timing never reveals
whether an address has an account. Failures are logged by class only: neither the
recipient nor the message body (which carries a one-time link) is ever logged
outside the development console backend.
"""

from __future__ import annotations

import logging
import smtplib
import ssl
from dataclasses import dataclass
from email.message import EmailMessage
from email.utils import formataddr, make_msgid

from app.core.config import settings


logger = logging.getLogger("citymind.email")


@dataclass(frozen=True)
class OutgoingEmail:
    to: str
    subject: str
    text: str


def send_email(message: OutgoingEmail) -> bool:
    """Deliver one message; returns False instead of raising on any failure."""
    backend = settings.email_backend
    if backend == "disabled":
        logger.warning("email_not_sent reason=disabled subject=%r", message.subject)
        return False
    if backend == "console":
        # Development only (production refuses this backend): print the full
        # message so one-time links can be followed locally.
        logger.info("email_console to=%s subject=%r\n%s", message.to, message.subject, message.text)
        return True
    try:
        _send_smtp(message)
    except (OSError, smtplib.SMTPException) as exc:
        logger.error("email_delivery_failed error=%s", type(exc).__name__)
        return False
    logger.info("email_sent subject=%r", message.subject)
    return True


def _send_smtp(message: OutgoingEmail) -> None:
    email = EmailMessage()
    email["From"] = formataddr((settings.email_from_name, settings.email_from or ""))
    email["To"] = message.to
    email["Subject"] = message.subject
    email["Message-ID"] = make_msgid(domain=(settings.email_from or "citymind.local").split("@")[-1])
    email.set_content(message.text, charset="utf-8")

    host = settings.smtp_host or ""
    timeout = settings.smtp_timeout_seconds
    context = ssl.create_default_context()
    if settings.smtp_security == "ssl":
        client: smtplib.SMTP = smtplib.SMTP_SSL(host, settings.smtp_port, timeout=timeout, context=context)
    else:
        client = smtplib.SMTP(host, settings.smtp_port, timeout=timeout)
    with client:
        if settings.smtp_security == "starttls":
            client.starttls(context=context)
        if settings.smtp_username and settings.smtp_password:
            client.login(settings.smtp_username, settings.smtp_password.get_secret_value())
        client.send_message(email)


def web_link(path: str, token: str) -> str:
    base = (settings.public_web_url or "http://127.0.0.1:3000").rstrip("/")
    # Fragment, not query string: the token never reaches server or proxy access
    # logs, and it is not sent in the Referer header of any later request.
    return f"{base}{path}#token={token}"


def verification_email(to: str, full_name: str, token: str) -> OutgoingEmail:
    link = web_link("/verify-email", token)
    hours = settings.email_verification_ttl_seconds // 3600
    return OutgoingEmail(
        to=to,
        subject="تأكيد بريدك الإلكتروني في CityMind Tripoli",
        text=(
            f"مرحبًا {full_name}،\n\n"
            "شكرًا لتسجيلك في CityMind Tripoli. لتفعيل حسابك، افتح الرابط التالي:\n\n"
            f"{link}\n\n"
            f"ينتهي هذا الرابط خلال {hours} ساعة. إذا لم تنشئ هذا الحساب، تجاهل هذه الرسالة.\n"
        ),
    )


def already_registered_email(to: str) -> OutgoingEmail:
    link = f"{(settings.public_web_url or 'http://127.0.0.1:3000').rstrip('/')}/forgot-password"
    return OutgoingEmail(
        to=to,
        subject="محاولة تسجيل ببريدك في CityMind Tripoli",
        text=(
            "طلب أحدهم إنشاء حساب جديد بهذا البريد، لكن لديك حساب مسجّل مسبقًا.\n\n"
            "إذا كنت أنت، سجّل الدخول بكلمة مرورك. وإذا نسيتها، يمكنك تعيين كلمة جديدة من هنا:\n\n"
            f"{link}\n\n"
            "إذا لم تطلب ذلك، تجاهل هذه الرسالة؛ لم يتغيّر شيء في حسابك.\n"
        ),
    )


def password_reset_email(to: str, full_name: str, token: str) -> OutgoingEmail:
    link = web_link("/reset-password", token)
    minutes = settings.password_reset_ttl_seconds // 60
    return OutgoingEmail(
        to=to,
        subject="إعادة تعيين كلمة المرور في CityMind Tripoli",
        text=(
            f"مرحبًا {full_name}،\n\n"
            "وصلنا طلب لإعادة تعيين كلمة مرور حسابك. لاختيار كلمة مرور جديدة، افتح الرابط التالي:\n\n"
            f"{link}\n\n"
            f"ينتهي هذا الرابط خلال {minutes} دقيقة ويعمل مرة واحدة فقط. "
            "إذا لم تطلب ذلك، تجاهل هذه الرسالة وستبقى كلمة مرورك كما هي.\n"
        ),
    )


def password_changed_email(to: str, full_name: str) -> OutgoingEmail:
    return OutgoingEmail(
        to=to,
        subject="تم تغيير كلمة المرور في CityMind Tripoli",
        text=(
            f"مرحبًا {full_name}،\n\n"
            "تم تغيير كلمة مرور حسابك وتسجيل الخروج من جميع الأجهزة.\n\n"
            "إذا لم تقم بذلك، أعد تعيين كلمة المرور فورًا وتواصل مع إدارة CityMind.\n"
        ),
    )
