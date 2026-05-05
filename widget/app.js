class HTMLChineseWidgetElement extends HTMLElement {
  async connectedCallback() {
    class ChineseCharacter {
      constructor(data, isAudioEnabled) {
        this.char = data.char;
        this.pinyin = data.pinyin;
        this.translation = data.translation;
        this.example = data.example;
        this.exTranslation = data.exTranslation;
        this.isAudioEnabled = isAudioEnabled;
      }
      playAudio() {
        if (!this.isAudioEnabled) return;
        const u = new SpeechSynthesisUtterance(this.char);
        u.lang = "zh-CN";
        speechSynthesis.speak(u);
      }
    }

    class ProgressTracker {
      constructor(widgetId) {
        this.storageKeyScore = `cn_widget_v1_prog_${widgetId}`;
        this.storageKeyLearned = `cn_widget_v1_learned_${widgetId}`;
        this.progress =
          parseFloat(localStorage.getItem(this.storageKeyScore)) || 0;
        const savedLearned = localStorage.getItem(this.storageKeyLearned);
        this.learnedChars = savedLearned
          ? new Set(JSON.parse(savedLearned))
          : new Set();
      }
      saveScore(score) {
        const increment = score * 0.1;
        this.progress = Math.min(this.progress + increment, 100);
        localStorage.setItem(this.storageKeyScore, this.progress.toFixed(1));
      }
      toggleLearned(char) {
        if (this.learnedChars.has(char)) {
          this.learnedChars.delete(char);
        } else {
          this.learnedChars.add(char);
        }
        this.saveLearned();
      }
      isLearned(char) {
        return this.learnedChars.has(char);
      }
      saveLearned() {
        localStorage.setItem(
          this.storageKeyLearned,
          JSON.stringify([...this.learnedChars]),
        );
      }
      getLearnedCount() {
        return this.learnedChars.size;
      }
    }

    class Quiz {
      constructor(allCards, config) {
        this.config = config;
        this.allCards = allCards;
        this.queue = [...allCards]
          .sort(() => Math.random() - 0.5)
          .slice(0, config.count);
        this.pointer = 0;
        this.score = 0;
        this.isInterrupted = false;
      }
      getCurrentQuestion() {
        return this.queue[this.pointer];
      }
      getOptions() {
        const current = this.getCurrentQuestion();
        const correctAnswer = current[this.config.aType];
        const options = [correctAnswer];
        while (options.length < 4) {
          const randCard =
            this.allCards[Math.floor(Math.random() * this.allCards.length)];
          const randVal = randCard[this.config.aType];
          if (!options.includes(randVal)) options.push(randVal);
        }
        return options.sort(() => Math.random() - 0.5);
      }
      checkAnswer(answer) {
        const correct = this.getCurrentQuestion()[this.config.aType];
        const isCorrect = answer === correct;
        if (isCorrect) this.score++;
        return { isCorrect, correctAnswer: correct };
      }
      next() {
        if (this.pointer < this.queue.length - 1) {
          this.pointer++;
          return true;
        }
        return false;
      }
      getResults() {
        const attempted = this.isInterrupted ? this.pointer : this.queue.length;
        return {
          score: this.score,
          total: attempted,
          percent:
            attempted > 0 ? Math.round((this.score / attempted) * 100) : 0,
          isInterrupted: this.isInterrupted,
        };
      }
    }

    class WidgetController {
      constructor(container, host, cardData, i18n) {
        this.container = container;
        this.host = host;
        this.i18n = i18n;
        this.isAudioEnabled = host.dataset.audio !== "false";
        this.cards = cardData.map(
          (data) => new ChineseCharacter(data, this.isAudioEnabled),
        );
        this.tracker = new ProgressTracker(host.id);
        this.currentIndex = parseInt(host.dataset.startCard) || 0;
        this.state = "study";
        this.showExample = false;
        this.testConfig = { count: 10, qType: "char", aType: "translation" };
        this.quiz = null;
        this.render();
      }

      render() {
        this.container.innerHTML = "";
        const t = this.i18n;
        const panel = document.createElement("div");
        panel.className = "main-panel";

        const headerContainer = document.createElement("div");
        headerContainer.className = "header-container";

        const statsBtn = document.createElement("button");
        statsBtn.className = "icon-btn stats-btn";
        statsBtn.title = t.stats;
        statsBtn.innerHTML = t.icons.stats;
        statsBtn.onclick = () => {
          this.state = this.state === "stats" ? "study" : "stats";
          this.render();
        };

        const header = document.createElement("div");
        header.className = "header-title";

        if (this.state === "study")
          header.textContent = `${t.study} ${this.currentIndex + 1} / ${this.cards.length}`;
        if (this.state === "setup") header.textContent = t.setup;
        if (this.state === "test")
          header.textContent = `${t.test} ${this.quiz.pointer + 1} ${t.of} ${this.quiz.queue.length}`;
        if (this.state === "result") header.textContent = t.result;
        if (this.state === "stats") header.textContent = t.stats;

        headerContainer.appendChild(statsBtn);
        headerContainer.appendChild(header);
        panel.appendChild(headerContainer);

        switch (this.state) {
          case "study":
            this.renderCard(panel);
            break;
          case "setup":
            this.renderSetup(panel);
            break;
          case "test":
            this.renderTest(panel);
            break;
          case "result":
            this.renderResult(panel);
            break;
          case "stats":
            this.renderStats(panel);
            break;
        }
        this.container.appendChild(panel);
      }

      renderCard(panel) {
        const t = this.i18n;
        const item = this.cards[this.currentIndex];
        const isLearned = this.tracker.isLearned(item.char);
        const cardArea = document.createElement("div");
        cardArea.className = "card-area";
        cardArea.innerHTML = `
            <div class="char-text">${item.char}</div>
            <div class="info-section">
              <div class="pinyin-text">${item.pinyin}</div>
              <div class="trans-text">${item.translation}</div>
            </div>
            <div class="action-row">
              <button class="icon-btn" id="audio-btn" style="display: ${this.isAudioEnabled ? "inline-block" : "none"}" title="Play">${t.icons.audio}</button>
              <button class="icon-btn learned-toggle ${isLearned ? "learned-active" : ""}" title="Learn">${isLearned ? t.icons.learned_on : t.icons.learned_off}</button>
              <button class="example-toggle">${this.showExample ? t.btn_hide_ex : t.btn_show_ex}</button>
            </div>
          `;

        if (this.showExample) {
          const exBox = document.createElement("div");
          exBox.className = "example-box";
          exBox.innerHTML = `<p class="ex-zh">${item.example}</p><p class="ex-ru">${item.exTranslation}</p>`;
          cardArea.appendChild(exBox);
        }
        panel.appendChild(cardArea);

        const nav = document.createElement("div");
        nav.className = "nav-row";
        nav.innerHTML = `<button class="nav-btn" ${this.currentIndex === 0 ? "disabled" : ""}>←</button><button class="nav-btn" ${this.currentIndex === this.cards.length - 1 ? "disabled" : ""}>→</button>`;
        const [btnP, btnN] = nav.querySelectorAll(".nav-btn");
        btnP.onclick = () => {
          this.currentIndex--;
          this.showExample = false;
          this.render();
        };
        btnN.onclick = () => {
          this.currentIndex++;
          this.showExample = false;
          this.render();
        };

        const startTestBtn = document.createElement("button");
        startTestBtn.className = "test-btn";
        startTestBtn.textContent = t.btn_start_test;
        startTestBtn.onclick = () => {
          this.state = "setup";
          this.render();
        };

        cardArea.querySelector("#audio-btn").onclick = () => item.playAudio();
        cardArea.querySelector(".learned-toggle").onclick = () => {
          this.tracker.toggleLearned(item.char);
          this.render();
        };
        cardArea.querySelector(".example-toggle").onclick = () => {
          this.showExample = !this.showExample;
          this.render();
        };
        panel.append(nav, startTestBtn);
      }

      renderSetup(panel) {
        const t = this.i18n;
        const setupArea = document.createElement("div");
        setupArea.className = "card-area";
        const createSection = (
          title,
          currentVal,
          typeEntries,
          callback,
          isDisabled = () => false,
        ) => {
          const sec = document.createElement("div");
          sec.innerHTML = `<div class="question-text" style="margin-top:10px">${title}</div>`;
          typeEntries.forEach(([val, label]) => {
            const btn = document.createElement("button");
            btn.className = `answer-btn ${currentVal === val ? "active" : ""}`;
            btn.textContent = label;
            btn.disabled = isDisabled(val);
            btn.onclick = () => {
              callback(val);
              this.render();
            };
            sec.appendChild(btn);
          });
          return sec;
        };

        setupArea.appendChild(
          createSection(
            t.label_question,
            this.testConfig.qType,
            Object.entries(t.types),
            (v) => {
              this.testConfig.qType = v;
              if (this.testConfig.aType === v)
                this.testConfig.aType = v === "char" ? "translation" : "char";
            },
          ),
        );
        setupArea.appendChild(
          createSection(
            t.label_answer,
            this.testConfig.aType,
            Object.entries(t.types),
            (v) => {
              this.testConfig.aType = v;
            },
            (v) => v === this.testConfig.qType,
          ),
        );
        setupArea.appendChild(
          createSection(
            t.label_count,
            this.testConfig.count,
            [10, 20, 50, 100].map((n) => [n, n]),
            (v) => {
              this.testConfig.count = v;
            },
          ),
        );

        const btnContainer = document.createElement("div");
        btnContainer.style.cssText = "display:flex; gap:10px; margin-top:20px;";
        const backBtn = document.createElement("button");
        backBtn.className = "test-btn cancel-btn";
        backBtn.textContent = t.btn_back;
        backBtn.onclick = () => {
          this.state = "study";
          this.render();
        };
        const goBtn = document.createElement("button");
        goBtn.className = "test-btn";
        goBtn.textContent = t.btn_go;
        goBtn.onclick = () => {
          this.quiz = new Quiz(this.cards, this.testConfig);
          this.state = "test";
          this.render();
        };
        btnContainer.append(backBtn, goBtn);
        setupArea.appendChild(btnContainer);
        panel.appendChild(setupArea);
      }

      renderTest(panel) {
        const t = this.i18n;
        const current = this.quiz.getCurrentQuestion();
        const testArea = document.createElement("div");
        testArea.className = "card-area";
        testArea.innerHTML = `
            <div class="question-text">${t.label_select_correct}</div>
            <div class="char-text" style="font-size: 42px; margin: 15px 0;">${current[this.quiz.config.qType]}</div>
            <div class="answers-grid"></div>
          `;
        const grid = testArea.querySelector(".answers-grid");
        this.quiz.getOptions().forEach((opt) => {
          const btn = document.createElement("button");
          btn.className = "answer-btn";
          btn.textContent = opt;
          btn.onclick = () => {
            grid.classList.add("disabled");
            const { isCorrect, correctAnswer } = this.quiz.checkAnswer(opt);
            if (isCorrect) {
              btn.classList.add("correct");
            } else {
              btn.classList.add("wrong");
              Array.from(grid.children).forEach((b) => {
                if (b.textContent === correctAnswer) b.classList.add("correct");
              });
            }
            setTimeout(() => {
              if (this.quiz.next()) {
                this.render();
              } else {
                this.state = "result";
                this.render();
              }
            }, 500);
          };
          grid.appendChild(btn);
        });
        panel.appendChild(testArea);
        const exitBtn = document.createElement("button");
        exitBtn.className = "answer-btn exit-test-btn";
        exitBtn.textContent = t.btn_finish;
        exitBtn.onclick = () => {
          this.quiz.isInterrupted = true;
          this.state = "result";
          this.render();
        };
        panel.appendChild(exitBtn);
      }

      renderResult(panel) {
        const t = this.i18n;
        const resArea = document.createElement("div");
        resArea.className = "card-area";
        const results = this.quiz.getResults();
        resArea.innerHTML = `
            <div class="question-text">${results.isInterrupted ? t.label_test_interrupted : t.label_test_complete}</div>
            <div class="char-text" style="font-size:48px">${results.score} / ${results.total}</div>
            <div class="pinyin-text">${t.label_accuracy}: ${results.percent}%</div>
          `;
        if (results.total > 0) {
          this.tracker.saveScore(results.score);
        }
        const backBtn = document.createElement("button");
        backBtn.className = "test-btn";
        backBtn.textContent = t.btn_return;
        backBtn.onclick = () => {
          this.state = "study";
          this.render();
        };
        panel.append(resArea, backBtn);
      }

      renderStats(panel) {
        const t = this.i18n;
        const statsArea = document.createElement("div");
        statsArea.className = "card-area";
        const total = this.cards.length;
        const learned = this.tracker.getLearnedCount();
        const percent = total > 0 ? Math.round((learned / total) * 100) : 0;
        statsArea.innerHTML = `
            <div class="question-text" style="text-align:center; font-weight:600; margin-bottom: 15px;">${t.label_progress_title}</div>
            <div class="char-text" style="font-size:48px; color:#2ecc71;">${learned} <span style="font-size:24px; color:#95a5a6;">/ ${total}</span></div>
            <div class="pinyin-text" style="text-align:center; margin-bottom: 20px;">${t.label_learned_desc}</div>
            <div class="progress-container">
              <div class="progress-text" style="display:flex; justify-content:space-between;">
                <span>${t.label_progress_bar}</span><span>${percent}%</span>
              </div>
              <div class="progress-bar"><div class="progress-fill" style="width: ${percent}%;"></div></div>
            </div>
          `;
        const backBtn = document.createElement("button");
        backBtn.className = "test-btn";
        backBtn.style.marginTop = "25px";
        backBtn.textContent = t.btn_return_study;
        backBtn.onclick = () => {
          this.state = "study";
          this.render();
        };
        statsArea.appendChild(backBtn);
        panel.appendChild(statsArea);
      }
    }

    const shadow = this.attachShadow({ mode: "open" });
    const wrapper = document.createElement("div");
    wrapper.className = "widget-root";
    const cssPath = this.dataset.css || "widget/app.css";
    const cardsPath = this.dataset.cards || "widget/cards.json";
    const i18nPath = this.dataset.i18n || "widget/i18n.json";

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = cssPath;
    shadow.append(link, wrapper);

    try {
      const [cardsRes, i18nRes] = await Promise.all([
        fetch(cardsPath),
        fetch(i18nPath),
      ]);
      const cards = await cardsRes.json();
      const i18n = await i18nRes.json();
      new WidgetController(wrapper, this, cards, i18n);
    } catch (e) {
      wrapper.textContent = "Error loading data.";
    }
  }
}
customElements.define("chinese-widget", HTMLChineseWidgetElement);
