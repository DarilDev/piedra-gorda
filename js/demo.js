"use strict";

const dayInMilliseconds = 86_400_000;
const islandDate = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Atlantic/Canary",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const text = document.documentElement.lang === "en"
  ? { locale: "en-GB", night: "night", nights: "nights", guest: "guest", guests: "guests", photoSeparator: "of" }
  : { locale: "es-ES", night: "noche", nights: "noches", guest: "huésped", guests: "huéspedes", photoSeparator: "de" };
const displayDate = new Intl.DateTimeFormat(text.locale, { dateStyle: "long", timeZone: "UTC" });

function nextDay(date) {
  return new Date(Date.parse(date) + dayInMilliseconds).toISOString().slice(0, 10);
}

function populateStayForm(form) {
  const arrival = form.elements.llegada;
  const departure = form.elements.salida;
  const guests = form.elements.personas;
  const result = document.querySelector("[data-reservation-result]");
  const languageLink = document.querySelector("[data-stay-language]");
  const isReservationPage = form.hasAttribute("data-reservation");
  const today = islandDate.format(new Date());

  arrival.min = today;
  arrival.max = "9999-12-30";
  departure.max = "9999-12-31";

  function updateConstraints() {
    departure.min = nextDay(arrival.value && arrival.validity.valid ? arrival.value : today);
    if (result) result.hidden = true;

    if (languageLink) {
      const alternate = new URL(languageLink.href);
      alternate.search = new URLSearchParams(new FormData(form));
      languageLink.href = alternate.href;
    }
  }

  if (isReservationPage) {
    const query = new URLSearchParams(window.location.search);
    for (const input of [arrival, departure]) {
      const value = query.get(input.name);
      if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) input.value = value;
    }

    const guestCount = query.get(guests.name);
    if (Array.from(guests.options).some((option) => option.value === guestCount)) {
      guests.value = guestCount;
    }
  }

  updateConstraints();
  form.addEventListener("input", updateConstraints);
  form.addEventListener("change", updateConstraints);

  if (!isReservationPage || !result) return;

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const nights = (departure.valueAsNumber - arrival.valueAsNumber) / dayInMilliseconds;
    const guestCount = Number(guests.value);

    result.querySelector("[data-arrival]").textContent = displayDate.format(arrival.valueAsDate);
    result.querySelector("[data-departure]").textContent = displayDate.format(departure.valueAsDate);
    result.querySelector("[data-nights]").textContent = `${nights} ${nights === 1 ? text.night : text.nights}`;
    result.querySelector("[data-guests]").textContent = `${guestCount} ${guestCount === 1 ? text.guest : text.guests}`;
    result.hidden = false;
    result.querySelector("h3").focus();
  });
}

function enableGallery(dialog, links) {
  const photo = dialog.querySelector("[data-active-photo]");
  const title = dialog.querySelector("h2");
  const position = dialog.querySelector("[data-photo-position]");
  const close = dialog.querySelector("[data-close-photo]");
  let currentIndex = 0;
  let opener;

  function showPhoto(index) {
    currentIndex = (index + links.length) % links.length;
    const link = links[currentIndex];
    title.textContent = link.querySelector("span").textContent;
    photo.alt = link.querySelector("img").alt;
    photo.src = link.href;
    position.textContent = `${currentIndex + 1} ${text.photoSeparator} ${links.length}`;
  }

  for (const [index, link] of links.entries()) {
    link.setAttribute("aria-haspopup", "dialog");
    link.addEventListener("click", (event) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      event.preventDefault();
      opener = link;
      showPhoto(index);
      dialog.showModal();
      close.focus();
    });
  }

  close.addEventListener("click", () => dialog.close());
  dialog.querySelector("[data-previous-photo]").addEventListener("click", () => showPhoto(currentIndex - 1));
  dialog.querySelector("[data-next-photo]").addEventListener("click", () => showPhoto(currentIndex + 1));
  dialog.addEventListener("close", () => opener?.focus());
  dialog.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      showPhoto(currentIndex + (event.key === "ArrowLeft" ? -1 : 1));
    }
  });
}

document.querySelectorAll("[data-stay-form]").forEach(populateStayForm);

const gallery = document.querySelector("[data-gallery-dialog]");
if (typeof gallery?.showModal === "function") {
  enableGallery(gallery, Array.from(document.querySelectorAll("[data-gallery-image]")));
}
