(function run() {
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "style.css";
  document.head.appendChild(link);

  // Fetch page content and initialize layout
  fetch("data.json")
    .then((response) => response.json())
    .then((data) => {
      const titleEl = document.createElement("title");
      titleEl.textContent = data.title;
      document.head.appendChild(titleEl);

      const body = document.body;
      body.classList.add("page");

      const container = document.createElement("div");
      container.className = "container";
      body.appendChild(container);

      const title = document.createElement("h1");
      title.className = "title";
      title.textContent = data.title;
      container.appendChild(title);

      const sketchSection = document.createElement("div");
      sketchSection.className = "sketch-section";

      const sketchImg = document.createElement("img");
      sketchImg.src = data.sketch;
      sketchImg.alt = "Widget sketch";
      sketchImg.className = "sketch-image";
      sketchSection.appendChild(sketchImg);
      container.appendChild(sketchSection);

      const description = document.createElement("p");
      description.className = "description";
      description.textContent = data.description;
      container.appendChild(description);

      const storiesContainer = document.createElement("div");
      storiesContainer.className = "stories-container";
      container.appendChild(storiesContainer);

      function createStorySection(titleText, storiesArray) {
        const section = document.createElement("div");
        section.className = "section";
        const sectionTitle = document.createElement("h2");
        sectionTitle.className = "section-title";
        sectionTitle.textContent = titleText;
        section.appendChild(sectionTitle);
        storiesArray.forEach((story) => {
          const p = document.createElement("p");
          p.className = "story";
          p.textContent = story;
          section.appendChild(p);
        });
        return section;
      }

      storiesContainer.appendChild(
        createStorySection(data.sectionTitles.visitor, data.visitorStories),
      );
      storiesContainer.appendChild(
        createStorySection(data.sectionTitles.admin, data.adminStories),
      );
      storiesContainer.appendChild(
        createStorySection(data.sectionTitles.developer, data.developerStories),
      );

      // Load widget script and create instances
      const widgetScript = document.createElement("script");
      widgetScript.src = "widget/app.js";
      document.head.appendChild(widgetScript);

      const widgetsWrapper = document.createElement("div");
      widgetsWrapper.className = "widgets-wrapper";
      widgetsWrapper.style.display = "flex";
      widgetsWrapper.style.justifyContent = "center";
      widgetsWrapper.style.gap = "20px";
      widgetsWrapper.style.flexWrap = "wrap";
      widgetsWrapper.style.marginTop = "40px";
      container.appendChild(widgetsWrapper);

      // Widget Instance 1: Standard
      const widget1 = document.createElement("chinese-widget");
      widget1.id = "chinese-widget-1";
      widget1.dataset.cards = "widget/cards.json";
      widget1.dataset.i18n = "widget/i18n.json"; // Указываем файл перевода
      widgetsWrapper.appendChild(widget1);

      // Widget Instance 2: Custom start index
      const widget2 = document.createElement("chinese-widget");
      widget2.id = "chinese-widget-2";
      widget2.dataset.cards = "widget/hsk2_cards.json";
      widget2.dataset.i18n = "widget/i18n.json";
      widget2.dataset.startCard = "2";
      widgetsWrapper.appendChild(widget2);

      // Widget Instance 3: Audio off
      const widget3 = document.createElement("chinese-widget");
      widget3.id = "chinese-widget-3";
      widget3.dataset.audio = "false";
      widget3.dataset.cards = "widget/hsk3_cards.json";
      widget3.dataset.i18n = "widget/i18n.json";
      widget3.dataset.startCard = "3";
      widgetsWrapper.appendChild(widget3);
    })
    .catch((error) => console.error("Error loading data.json:", error));
})();
