const menuButton = document.querySelector(".menu-toggle");
const nav = document.querySelector(".main-nav");
const roleSelect = document.querySelector("#role");
const form = document.querySelector(".waitlist-form");
const formNote = document.querySelector(".form-note");

function setRole(role) {
  if (!roleSelect || !role) return;
  roleSelect.value = role;
}

menuButton?.addEventListener("click", () => {
  const isOpen = nav.classList.toggle("open");
  menuButton.setAttribute("aria-expanded", String(isOpen));
});

document.querySelectorAll("a[href^='#']").forEach((link) => {
  link.addEventListener("click", () => {
    nav?.classList.remove("open");
    menuButton?.setAttribute("aria-expanded", "false");
    setRole(link.dataset.role);
  });
});

document.querySelectorAll("[data-role]").forEach((item) => {
  item.addEventListener("click", () => setRole(item.dataset.role));
});

form?.addEventListener("submit", (event) => {
  event.preventDefault();

  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  formNote.textContent = "Thanks - we'll be in touch.";
  form.reset();
});

// ==========================================================================
// PREMIUM ENHANCEMENTS (UI/UX)
// ==========================================================================

// --- Navigation Sticky Effect ---
const header = document.querySelector(".site-header");
if (header) {
  window.addEventListener("scroll", () => {
    if (window.scrollY > 20) {
      header.classList.add("scrolled");
    } else {
      header.classList.remove("scrolled");
    }
  }, { passive: true });
}

// --- Scroll Reveal Animations ---
const revealOptions = {
  threshold: 0.15,
  rootMargin: "0px 0px -50px 0px"
};

const revealObserver = new IntersectionObserver((entries, observer) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add("reveal-visible");
      observer.unobserve(entry.target);
    }
  });
}, revealOptions);

// Apply reveal up to all sections except hero (which has page load animation)
document.querySelectorAll("section:not(.hero)").forEach(section => {
  section.classList.add("reveal-up");
  revealObserver.observe(section);
});

// --- Number Counters Animation ---
const countObserver = new IntersectionObserver((entries, observer) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const target = entry.target;
      const text = target.innerText;
      const match = text.match(/(\d+)(-\d+)?%/);
      if (match) {
        animateValue(target, match[0]);
      }
      observer.unobserve(target);
    }
  });
}, revealOptions);

function animateValue(obj, text) {
  if (text.includes("-")) {
    const parts = text.replace("%", "").split("-");
    const end1 = parseInt(parts[0]);
    const end2 = parseInt(parts[1]);
    const duration = 1500;
    const stepTime = 30;
    const steps = duration / stepTime;
    let currentStep = 0;
    const timer = setInterval(() => {
      currentStep++;
      const val1 = Math.round((end1 / steps) * currentStep);
      const val2 = Math.round((end2 / steps) * currentStep);
      obj.innerText = `${val1}-${val2}%`;
      if (currentStep >= steps) {
        obj.innerText = text;
        clearInterval(timer);
      }
    }, stepTime);
  } else {
    const end = parseInt(text.replace("%", ""));
    const duration = 1500;
    const stepTime = 30;
    const steps = duration / stepTime;
    let currentStep = 0;
    const timer = setInterval(() => {
      currentStep++;
      const val = Math.round((end / steps) * currentStep);
      obj.innerText = `${val}%`;
      if (currentStep >= steps) {
        obj.innerText = text;
        clearInterval(timer);
      }
    }, stepTime);
  }
}

document.querySelectorAll("strong").forEach(str => {
  if (str.innerText.includes("%")) {
    countObserver.observe(str);
  }
});
