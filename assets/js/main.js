(function () {
  document.documentElement.classList.remove("no-js");

  // Mobile navigation
  var toggle = document.querySelector(".nav-toggle");
  if (toggle) {
    toggle.addEventListener("click", function () {
      var open = document.body.classList.toggle("nav-open");
      toggle.setAttribute("aria-expanded", String(open));
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && document.body.classList.contains("nav-open")) {
        document.body.classList.remove("nav-open");
        toggle.setAttribute("aria-expanded", "false");
        toggle.focus();
      }
    });
  }

  // Prefill form controls from the query string (e.g. /signup?plan=metal, /contact?topic=careers)
  new URLSearchParams(location.search).forEach(function (value, key) {
    document.querySelectorAll('form [name="' + key.replace(/[^\w-]/g, "") + '"]').forEach(function (el) {
      if (el.type === "radio") el.checked = el.value === value;
      else if (el.tagName === "SELECT" && el.querySelector('option[value="' + value.replace(/[^\w-]/g, "") + '"]')) el.value = value;
    });
  });

  // Footer year
  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });

  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var hasIO = "IntersectionObserver" in window;

  // Headline word rise: wrap each word so it can slide up from behind a mask
  document.querySelectorAll(".hero .display, .page-hero .display").forEach(function (el) {
    if (!reduceMotion) {
      var words = el.textContent.trim().split(/\s+/);
      el.setAttribute("aria-label", words.join(" "));
      el.innerHTML = words.map(function (w, i) {
        return '<span class="split-word" aria-hidden="true"><span style="--i:' + i + '">' + w + "</span></span>";
      }).join(" ");
    }
    el.classList.add("is-split");
  });

  // Groups whose children should appear one after another
  var STAGGER = ".grid, .steps, .metrics, .team, .timeline, .contact-list, .testimonial__stats";
  document.querySelectorAll(".reveal").forEach(function (el) {
    if (el.matches(STAGGER)) {
      el.classList.add("reveal--stagger");
      Array.prototype.forEach.call(el.children, function (child, i) { child.style.setProperty("--i", i); });
    }
  });

  // Images that wipe in from the bottom
  document.querySelectorAll(".person__photo, .testimonial__photo, .product__visual, .promo").forEach(function (el) {
    if (!reduceMotion) el.classList.add("reveal-clip");
  });

  // Reveal on scroll
  var reveals = document.querySelectorAll(".reveal, .reveal-clip");
  function settle(el) {
    // Once a staggered group has played, drop the per-child delays so hover feels instant
    if (!el.classList.contains("reveal--stagger")) return;
    setTimeout(function () {
      el.classList.remove("reveal--stagger");
      Array.prototype.forEach.call(el.children, function (child) { child.style.removeProperty("--i"); });
    }, 1200 + el.children.length * 90);
  }
  if (hasIO && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-in");
          settle(entry.target);
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px -12% 0px" });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("is-in"); settle(el); });
  }

  // Scroll-driven effects: progress bar, header state, parallax
  var header = document.querySelector(".site-header");
  var progress = document.createElement("div");
  progress.className = "scroll-progress";
  progress.setAttribute("aria-hidden", "true");
  document.body.appendChild(progress);

  var parallax = reduceMotion ? [] : Array.prototype.slice.call(document.querySelectorAll("[data-parallax], [data-parallax-x]"));
  var lastY = window.scrollY, ticking = false;

  function onScroll() {
    var y = window.scrollY;
    var vh = window.innerHeight;
    var max = document.documentElement.scrollHeight - vh;
    progress.style.transform = "scaleX(" + (max > 0 ? Math.min(1, y / max) : 0) + ")";

    if (header) {
      header.classList.toggle("is-scrolled", y > 24);
      var hide = y > 320 && y > lastY && !document.body.classList.contains("nav-open");
      header.classList.toggle("is-hidden", hide);
    }

    parallax.forEach(function (el) {
      var minWidth = el.getAttribute("data-parallax-min");
      if (minWidth && window.innerWidth < parseInt(minWidth, 10)) { el.style.transform = ""; return; }
      var rect = el.getBoundingClientRect();
      if (rect.bottom < -200 || rect.top > vh + 200) return;
      var offset = rect.top + rect.height / 2 - vh / 2;
      var scale = el.getAttribute("data-parallax-scale");
      if (el.hasAttribute("data-parallax-x")) {
        var px = -offset * parseFloat(el.getAttribute("data-parallax-x"));
        el.style.transform = "translate3d(" + px.toFixed(1) + "px,0,0)";
      } else {
        var py = offset * parseFloat(el.getAttribute("data-parallax"));
        el.style.transform = "translate3d(0," + py.toFixed(1) + "px,0)" + (scale ? " scale(" + scale + ")" : "");
      }
    });

    lastY = y;
    ticking = false;
  }
  window.addEventListener("scroll", function () {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  window.addEventListener("resize", onScroll);
  onScroll();

  // Card tilt follows the pointer
  if (!reduceMotion && window.matchMedia("(hover: hover)").matches) {
    document.querySelectorAll("[data-tilt]").forEach(function (card) {
      var base = getComputedStyle(card).transform;
      base = base === "none" ? "" : base;
      card.addEventListener("pointermove", function (e) {
        var r = card.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width - 0.5;
        var y = (e.clientY - r.top) / r.height - 0.5;
        card.classList.add("is-tilting");
        card.style.transform = base + " perspective(900px) rotateY(" + (x * 16).toFixed(2) + "deg) rotateX(" + (-y * 12).toFixed(2) + "deg) scale(1.04)";
      });
      card.addEventListener("pointerleave", function () {
        card.classList.remove("is-tilting");
        card.style.transform = "";
      });
    });
  }

  // Count-up numbers
  document.querySelectorAll("[data-count]").forEach(function (el) {
    var target = parseFloat(el.getAttribute("data-count"));
    var suffix = el.getAttribute("data-suffix") || "";
    var prefix = el.getAttribute("data-prefix") || "";
    var decimals = (el.getAttribute("data-count").split(".")[1] || "").length;
    var run = function () {
      var start = performance.now();
      var dur = 1400;
      (function tick(now) {
        var p = Math.min(1, (now - start) / dur);
        var eased = 1 - Math.pow(1 - p, 3);
        el.textContent = prefix + (target * eased).toFixed(decimals) + suffix;
        if (p < 1) requestAnimationFrame(tick);
      })(start);
    };
    if ("IntersectionObserver" in window) {
      var o = new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) { run(); o.disconnect(); }
      });
      o.observe(el);
    }
  });

  // Audience toggle (Solution page)
  document.querySelectorAll("[data-toggle-group]").forEach(function (group) {
    var buttons = group.querySelectorAll("button[data-target]");
    buttons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        buttons.forEach(function (b) {
          var active = b === btn;
          b.setAttribute("aria-pressed", String(active));
          var panel = document.getElementById(b.getAttribute("data-target"));
          if (panel) panel.hidden = !active;
        });
      });
    });
  });

  // Password strength
  var pw = document.querySelector("[data-strength-input]");
  var meter = document.querySelector("[data-strength]");
  if (pw && meter) {
    pw.addEventListener("input", function () {
      var v = pw.value, s = 0;
      if (v.length >= 8) s++;
      if (/[A-Z]/.test(v) && /[a-z]/.test(v)) s++;
      if (/\d/.test(v)) s++;
      if (/[^A-Za-z0-9]/.test(v) && v.length >= 10) s++;
      meter.setAttribute("data-score", v ? String(Math.max(1, s)) : "0");
    });
  }

  // Form validation
  var messages = {
    valueMissing: "This field is required.",
    typeMismatch: "Please enter a valid value.",
    tooShort: "Too short.",
    patternMismatch: "Please match the requested format."
  };
  function errorFor(input) {
    var v = input.validity;
    if (v.valid) return "";
    if (input.dataset.error) return input.dataset.error;
    for (var key in messages) if (v[key]) return messages[key];
    return "Please check this field.";
  }
  function check(input) {
    var field = input.closest(".field");
    if (!field) return input.validity.valid;
    var msg = errorFor(input);
    field.classList.toggle("is-invalid", !!msg);
    var err = field.querySelector(".field__error");
    if (err) err.textContent = msg;
    input.setAttribute("aria-invalid", msg ? "true" : "false");
    return !msg;
  }

  document.querySelectorAll("form[data-validate]").forEach(function (form) {
    form.setAttribute("novalidate", "");
    var inputs = form.querySelectorAll("input, select, textarea");
    inputs.forEach(function (input) {
      input.addEventListener("blur", function () { check(input); });
      input.addEventListener("input", function () {
        if (input.closest(".field.is-invalid")) check(input);
      });
    });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var ok = true, first = null;
      inputs.forEach(function (input) {
        if (input.type === "checkbox" && input.required && !input.checked) {
          ok = false; first = first || input;
          input.closest(".checkbox").style.color = "#c4290f";
          return;
        } else if (input.type === "checkbox") {
          var cb = input.closest(".checkbox"); if (cb) cb.style.color = "";
        }
        if (!check(input)) { ok = false; first = first || input; }
      });
      var confirm = form.querySelector("[data-match]");
      if (confirm) {
        var orig = form.querySelector(confirm.getAttribute("data-match"));
        if (orig && orig.value !== confirm.value) {
          var f = confirm.closest(".field");
          f.classList.add("is-invalid");
          f.querySelector(".field__error").textContent = "Passwords do not match.";
          ok = false; first = first || confirm;
        }
      }
      if (!ok) { if (first) first.focus(); return; }
      var success = form.querySelector(".form-success");
      var name = form.querySelector("[name=firstName], [name=name]");
      if (success) {
        var tpl = success.getAttribute("data-template") || success.textContent;
        success.textContent = tpl.replace("{name}", name && name.value ? name.value.split(" ")[0] : "there");
        success.classList.add("is-visible");
        success.setAttribute("tabindex", "-1");
        success.focus();
      }
      form.reset();
      if (meter) meter.setAttribute("data-score", "0");
    });
  });
})();
