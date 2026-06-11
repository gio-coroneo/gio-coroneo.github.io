$(function() {
    $(".draggable").draggable();
    } );

/* Custom cursor dot */
document.addEventListener("DOMContentLoaded", function () {
    const dot = document.createElement('div');
    dot.id = 'cursor-dot';
    document.body.appendChild(dot);

    const clickable = 'a, button, input, textarea, select, label, summary, [onclick], [role="button"], .carousel-control, .filter-button, .clickable';

    document.addEventListener('mousemove', function (e) {
        dot.style.left = e.clientX + 'px';
        dot.style.top = e.clientY + 'px';
        dot.classList.toggle('hovering', !!(e.target.closest && e.target.closest(clickable)));
    });

    document.addEventListener('mouseleave', function () { dot.style.opacity = '0'; });
    document.addEventListener('mouseenter', function () { dot.style.opacity = '1'; });
});

/* Modal */
function openModal(img) {
    var modal = document.getElementById("modal");
    var expandedImg = document.getElementById("expandedImg");
    expandedImg.src = img.src;
  
    modal.style.display = "flex";
  }
  
  function closeModal() {
    var modal = document.getElementById("modal");
    modal.style.display = "none";
    var mv = document.getElementById("expandedVideo");
    if (mv) { mv.pause(); mv.style.display = "none"; }
    var img = document.getElementById("expandedImg");
    if (img) img.style.display = "";
  }

  function openVideoModal(video) {
    var modal = document.getElementById("modal");
    if (!modal) return;
    var content = modal.querySelector(".modal-content");
    var img = document.getElementById("expandedImg");
    if (img) img.style.display = "none";
    var mv = document.getElementById("expandedVideo");
    if (!mv) {
        mv = document.createElement("video");
        mv.id = "expandedVideo";
        mv.controls = false;
        mv.muted = true;
        mv.loop = true;
        mv.playsInline = true;
        content.appendChild(mv);
    }
    mv.src = video.getAttribute("src");
    mv.style.display = "block";
    mv.play().catch(function(){});
    modal.style.display = "flex";
  }

  /* Make videos clickable (open in modal) on every page except index */
  document.addEventListener("DOMContentLoaded", function () {
    var page = location.pathname.split("/").pop();
    if (page === "index.html" || page === "") return;
    if (!document.getElementById("modal")) return;
    document.querySelectorAll("video").forEach(function (v) {
        v.classList.add("clickable");
        // If the video sits inside a carousel item (and may be scaled down,
        // leaving empty space around it), make the whole item clickable so the
        // padding area opens the modal too and shows the hover cursor.
        var item = v.closest(".carousel-item");
        var target = item || v;
        target.classList.add("clickable");
        target.addEventListener("click", function (e) {
            if (e.target.closest(".carousel-control")) return;
            openVideoModal(v);
        });
    });
  });

/* Image Carousel */
document.querySelectorAll('.carousel').forEach(carousel => {
    const carouselInner = carousel.querySelector('.carousel-inner');
    const nextButton = carousel.querySelector('.next');
    const prevButton = carousel.querySelector('.prev');

    let carouselItems = Array.from(carousel.querySelectorAll('.carousel-item'));

    // Infinite, seamless loop for every carousel with more than one slide,
    // so all pages match the behavior of the index work grid.
    const infinite = carouselItems.length > 1;

    if (infinite && carouselItems.length > 1) {
        // Clone last slide before the first, and first slide after the last,
        // so sliding past either edge reveals a matching slide and loops smoothly.
        const firstClone = carouselItems[0].cloneNode(true);
        const lastClone = carouselItems[carouselItems.length - 1].cloneNode(true);
        [firstClone, lastClone].forEach(c => {
            c.classList.remove('active');
            c.querySelectorAll('[id]').forEach(el => el.removeAttribute('id'));
            const cid = c.getAttribute('id'); if (cid) c.removeAttribute('id');
        });
        carouselInner.insertBefore(lastClone, carouselItems[0]);
        carouselInner.appendChild(firstClone);
        carouselItems = Array.from(carousel.querySelectorAll('.carousel-item'));
    }

    let currentIndex = infinite ? 1 : 0;

    function setTransition(on) {
        carouselInner.style.transition = on ? 'transform 0.8s cubic-bezier(0.22, 1, 0.36, 1)' : 'none';
    }
    function updateCarousel() {
        carouselInner.style.transform = `translate3d(-${currentIndex * 100}%, 0, 0)`;
    }

    if (infinite) {
        // Position on the first real slide without animating.
        // Force a synchronous reflow so the jump is committed before
        // transitions are re-enabled, otherwise the browser sometimes
        // animates from the clone to the first slide on (re)load.
        setTransition(false);
        updateCarousel();
        void carouselInner.offsetWidth; // force reflow
        setTransition(true);

        carouselInner.addEventListener('transitionend', () => {
            if (currentIndex === 0) {
                // Reached the clone of the last slide -> jump to the real last slide
                setTransition(false);
                currentIndex = carouselItems.length - 2;
                updateCarousel();
                void carouselInner.offsetWidth; // force reflow
                setTransition(true);
            } else if (currentIndex === carouselItems.length - 1) {
                // Reached the clone of the first slide -> jump to the real first slide
                setTransition(false);
                currentIndex = 1;
                updateCarousel();
                void carouselInner.offsetWidth; // force reflow
                setTransition(true);
            }
        });
    }

    function handleVideos() {
        carouselItems.forEach((item) => {
            const video = item.querySelector('video');
            if (!video) return;
            const src = video.getAttribute('src') || '';
            // Free video (clip 2 copertina ID gramma): pause when hidden, play when visible
            if (src.includes('clip 2 (copertina)')) {
                // handled separately in free video logic
                return;
            }
            // Sync videos: never pause, never reset — sync engine keeps them aligned
            if (video.paused) video.play().catch(() => {});
        });
    }

    nextButton.addEventListener('click', () => {
        if (infinite) {
            if (currentIndex >= carouselItems.length - 1) return;
            currentIndex++;
            setTransition(true);
            updateCarousel();
        } else {
            currentIndex = (currentIndex + 1) % carouselItems.length;
            updateCarousel();
        }
        handleVideos();
    });

    prevButton.addEventListener('click', () => {
        if (infinite) {
            if (currentIndex <= 0) return;
            currentIndex--;
            setTransition(true);
            updateCarousel();
        } else {
            currentIndex = (currentIndex - 1 + carouselItems.length) % carouselItems.length;
            updateCarousel();
        }
        handleVideos();
    });
});

/* Make each project block clickable (index page) */
document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll('#work .project').forEach(function (proj) {
        var titleLink = proj.querySelector('.project-title');
        if (!titleLink) return;
        var href = titleLink.getAttribute('href');
        if (!href) return;
        proj.classList.add('clickable');
        proj.addEventListener('click', function (e) {
            // let carousel arrows and any inner link behave normally
            if (e.target.closest('.carousel-control')) return;
            if (e.target.closest('a')) return;
            window.location.href = href;
        });
    });
});

/* Filter Projects */
function filterProjects(filter, button) {
    var projects = document.querySelectorAll(".project");
    var isActive = button.classList.contains("active");
    var filterBlank = document.getElementById("filter-selection");
    var allButtons = document.querySelectorAll(".filter-button");

    allButtons.forEach(btn => btn.classList.remove("active"));

    if (!isActive) {
        button.classList.add("active");
        projects.forEach(project => {
            project.classList.toggle("hidden", !project.classList.contains(filter));
        });
        filterBlank.innerHTML = button.dataset.label;
    } else {
        button.classList.remove("active");
        projects.forEach(project => project.classList.remove("hidden"));
        filterBlank.innerHTML = "";
    }

    /* Close the dropdown after a selection; hover re-enables it once the cursor leaves the filter */
    var filterBox = document.getElementById("filter");
    var menu = filterBox.querySelector(".filter-select");
    menu.style.display = "none";
    filterBox.addEventListener("mouseleave", function () {
        menu.style.display = "";
    }, { once: true });
}

/* ============================================================
   VIDEO SYNC ENGINE
   All videos except "clip 2 (copertina)" share a master clock.
   Duration = 7s. They all run at (elapsed % 7) in lock-step,
   even when hidden in carousel slides.
   "clip 2 (copertina)" loops freely and independently.
   ============================================================ */
document.addEventListener("DOMContentLoaded", function () {
    const SYNC_DURATION = 7;
    const clockStart = performance.now();

    const syncVideos = [];
    const freeVideos = [];

    // Pages with this attribute let every video play its own real duration and loop independently
    const pageFreeAll = document.body.hasAttribute('data-free-videos');

    document.querySelectorAll('video').forEach(v => {
        const src = v.getAttribute('src') || '';
        v.muted = true;
        // Any video that opts into native looping (loop attribute) runs free and independent.
        if (pageFreeAll || v.hasAttribute('loop') || src.includes('clip 2 (copertina)') || src.includes('6. Density')) {
            freeVideos.push(v);
        } else {
            syncVideos.push(v);
        }
    });

    // Free video: simple independent loop
    freeVideos.forEach(v => {
        v.loop = true;
        v.play().catch(() => {});
    });

    // Sync engine: rAF loop keeps all sync videos at the same playhead
    function syncTick() {
        const elapsed = (performance.now() - clockStart) / 1000;
        const target = elapsed % SYNC_DURATION;

        syncVideos.forEach(v => {
            if (v.readyState < 2) return;
            if (v.paused) v.play().catch(() => {});
            const diff = Math.abs(v.currentTime - target);
            if (diff > 0.15) v.currentTime = target;
        });

        requestAnimationFrame(syncTick);
    }

    requestAnimationFrame(syncTick);
});

/* Tooltip */
document.addEventListener("DOMContentLoaded", function() {
    document.querySelectorAll('.draggable-img').forEach(function(draggableImg){
    
        draggableImg.addEventListener('mousemove', function(e) {
            var tooltip = this.querySelector('.tooltip');
            var rect = draggableImg.getBoundingClientRect();

            var x = e.clientX - rect.left;
            var y = e.clientY - rect.top;

            tooltip.style.visibility = 'visible';
            tooltip.style.left = x + 'px';
            tooltip.style.top = y + 'px';
        });
    
        draggableImg.addEventListener('mouseleave', function() {
            var tooltip = this.querySelector('.tooltip');
            if (tooltip) {
                tooltip.style.visibility = 'hidden';
            }
        });
    });
    });

    /* Hover overlay (e.g. About page) */
    document.addEventListener("DOMContentLoaded", function() {
  const link = document.getElementById("energizer-bunny-link");
  const overlay = document.getElementById("energizer-bunny");

  if (link && overlay) {
    link.addEventListener("mouseenter", () => {
      overlay.style.display = "block";
    });
    link.addEventListener("mouseleave", () => {
      overlay.style.display = "none";
    });
  }
});
