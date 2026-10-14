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

  // Reveal on scroll
  var reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-in");
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px -10% 0px" });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("is-in"); });
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
