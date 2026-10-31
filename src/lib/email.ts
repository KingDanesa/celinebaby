import "server-only";
import { Resend } from "resend";
import type { Order } from "@/lib/store/types";
import { formatPrice } from "@/lib/format";
import { STORE } from "@/data/categories";

const FROM = process.env.EMAIL_FROM || "Celine Baby <onboarding@resend.dev>";
const NOTIFY = process.env.ORDER_NOTIFY_EMAIL || STORE.email;

function client(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  return key ? new Resend(key) : null;
}

export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const resend = client();
  if (!resend) {
    console.log(`[email skipped: RESEND_API_KEY not set] to=${to} subject=${subject}`);
    return false;
  }
  const { error } = await resend.emails.send({ from: FROM, to, subject, html });
  if (error) {
    console.error("[email] failed:", error);
    return false;
  }
  return true;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function orderTable(order: Order): string {
  const rows = order.items
    .map(
      (i) => `<tr>
        <td style="padding:8px 0;border-bottom:1px solid #eee">${esc(i.name)}<br><span style="color:#888;font-size:12px">${esc([i.color, i.size].filter(Boolean).join(" · "))} × ${i.qty}</span></td>
        <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;white-space:nowrap">${formatPrice(i.price * i.qty)}</td>
      </tr>`,
    )
    .join("");
  return `<table style="width:100%;border-collapse:collapse;font-size:14px">${rows}
    <tr><td style="padding:12px 0;font-weight:bold">Итого</td><td style="padding:12px 0;text-align:right;font-weight:bold">${formatPrice(order.subtotal)}</td></tr>
  </table>`;
}

function layout(title: string, body: string): string {
  return `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#2a1c20">
    <p style="color:#b46b7a;font-size:22px;margin:0 0 16px">celine baby</p>
    <h1 style="font-size:20px;margin:0 0 16px">${esc(title)}</h1>
    ${body}
    <p style="margin-top:24px;font-size:12px;color:#888">${esc(STORE.address)} · ${esc(STORE.phone)} · ${esc(STORE.email)}</p>
  </div>`;
}

const paymentLabel = (o: Order) =>
  o.payment === "halyk" ? "Онлайн-оплата картой" : "Kaspi (счёт от менеджера)";

/** New order: notify the shop and confirm to the customer. */
export async function sendNewOrderEmails(order: Order, siteUrl: string) {
  const customer = order.customer;
  const info = `<p><b>Покупатель:</b> ${esc(customer.name)}<br>
    <b>Телефон:</b> ${esc(customer.phone)}<br>
    ${customer.email ? `<b>E-mail:</b> ${esc(customer.email)}<br>` : ""}
    <b>Город:</b> ${esc(customer.city)}${customer.address ? `, ${esc(customer.address)}` : ""}<br>
    ${customer.comment ? `<b>Комментарий:</b> ${esc(customer.comment)}<br>` : ""}
    <b>Оплата:</b> ${paymentLabel(order)}</p>`;

  await sendEmail(
    NOTIFY,
    `Новый заказ ${order.id} на ${formatPrice(order.subtotal)}`,
    layout(`Новый заказ ${order.id}`, info + orderTable(order) + `<p><a href="${siteUrl}/admin/orders/${order.id}">Открыть в админке</a></p>`),
  );

  if (customer.email) {
    const next =
      order.payment === "halyk"
        ? `<p>Если оплата ещё не завершена, вернитесь к ней по ссылке: <a href="${siteUrl}/${order.locale}/pay/${order.id}">оплатить заказ</a>.</p>`
        : `<p>Менеджер свяжется с вами и пришлёт счёт для оплаты через Kaspi.</p>`;
    await sendEmail(
      customer.email,
      `Ваш заказ ${order.id} принят — Celine Baby`,
      layout(`Спасибо за заказ, ${customer.name}!`, `<p>Мы получили ваш заказ ${order.id} и скоро свяжемся с вами.</p>` + orderTable(order) + next),
    );
  }
}

/** Payment confirmed by the bank. */
export async function sendPaidEmails(order: Order, siteUrl: string) {
  await sendEmail(
    NOTIFY,
    `Оплачен заказ ${order.id} на ${formatPrice(order.subtotal)}`,
    layout(`Заказ ${order.id} оплачен`, `<p>Банк подтвердил оплату.</p>` + orderTable(order) + `<p><a href="${siteUrl}/admin/orders/${order.id}">Открыть в админке</a></p>`),
  );
  if (order.customer.email) {
    await sendEmail(
      order.customer.email,
      `Оплата заказа ${order.id} получена — Celine Baby`,
      layout("Оплата получена", `<p>Спасибо! Заказ ${order.id} оплачен, мы собираем его и отправим в течение 48 часов.</p>` + orderTable(order)),
    );
  }
}

export async function sendPasswordResetEmail(to: string, link: string) {
  return sendEmail(
    to,
    "Восстановление пароля — Celine Baby",
    layout("Восстановление пароля", `<p>Чтобы задать новый пароль, перейдите по ссылке (действует 1 час):</p><p><a href="${link}">${link}</a></p><p>Если вы не запрашивали восстановление, просто проигнорируйте это письмо.</p>`),
  );
}
