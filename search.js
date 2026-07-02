document.addEventListener("DOMContentLoaded", () => {

    const searches = {};

    function normalize(text, respectAccents) {
        if (respectAccents) return text;
        return text
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");
    }

    function createSearch(containerId, inputId, buttonId, counterId, messageId, key) {

        const container = document.getElementById(containerId);
        const input = document.getElementById(inputId);
        const button = document.getElementById(buttonId);
        const counter = document.getElementById(counterId);
        const message = document.getElementById(messageId);

        const wholeWordCheckbox = document.getElementById("whole-word-only");
        const accentCheckbox = document.getElementById("respect-accents");

        if (!container || !input || !button) return;

        // 🔥 FIX PRINCIPAL : capture tardive
        let originalHTML = "";

        let results = [];
        let currentIndex = -1;
        let isValidated = false;

        function ensureOriginalHTML() {
            if (!originalHTML && container.innerHTML.trim() !== "") {
                originalHTML = container.innerHTML;
            }
        }

        function clearAll() {
            if (!originalHTML) return;
            container.innerHTML = originalHTML;
            results = [];
            currentIndex = -1;
            counter.textContent = "";
            message.textContent = "";
        }

        function setActive(index) {

            if (!results.length) return;

            results.forEach(el => el.classList.remove("active"));

            currentIndex = (index + results.length) % results.length;

            const el = results[currentIndex];
            el.classList.add("active");

            counter.textContent = `${currentIndex + 1} / ${results.length}`;

            el.scrollIntoView({ behavior: "smooth", block: "center" });
        }

        function buildHighlights(term, previewMode) {

            ensureOriginalHTML();
            if (!originalHTML) return;

            container.innerHTML = originalHTML;
            results = [];

            if (!term) return;

            const respectAccents = accentCheckbox.checked;
            const normalizedTerm = normalize(term.toLowerCase(), respectAccents);
            const wholeWord = wholeWordCheckbox.checked;

            function isWordBoundary(text, start, end) {
                const before = text[start - 1];
                const after = text[end];

                const isValid = c =>
                    c && /[a-zA-Z0-9À-ÿ_]/.test(c);

                return !isValid(before) && !isValid(after);
            }

			function levenshtein(a, b) {

    			const m = a.length;
    			const n = b.length;

    			const dp = Array.from({ length: m + 1 }, () => new Array(n + 1));

    			for (let i = 0; i <= m; i++) dp[i][0] = i;
    			for (let j = 0; j <= n; j++) dp[0][j] = j;

    			for (let i = 1; i <= m; i++) {
        			for (let j = 1; j <= n; j++) {

            			const cost = a[i - 1] === b[j - 1] ? 0 : 1;

            			dp[i][j] = Math.min(
            			    dp[i - 1][j] + 1,
            			    dp[i][j - 1] + 1,
            			    dp[i - 1][j - 1] + cost
        			    );
			        }
			    }

			    return dp[m][n];
			}

			function maxDistance(word) {

			    if (word.length <= 5) return 0;
			    if (word.length <= 10) return 2;
			    return 4;
			}

			function matchesWithOneInsertion(a, b) {
    			// a = mot trouvé dans le texte
    			// b = mot recherché

    			if (a.length !== b.length + 1) return false;

    			for (let i = 0; i < a.length; i++) {
    			    const test = a.slice(0, i) + a.slice(i + 1);
    			    if (test === b) return true;
   			 	}

    			return false;
			}

            function walk(node) {

                if (node.nodeType === 3) {

                    const text = node.nodeValue;
                    const parent = node.parentNode;

                    const lowerText = normalize(text.toLowerCase(), respectAccents);

                    let frag = document.createDocumentFragment();
                    let lastIndex = 0;
                    let index = 0;

					const maxDist = maxDistance(normalizedTerm);

					if (maxDist === 0) {

    					while ((index = lowerText.indexOf(normalizedTerm, index)) !== -1) {

        					const start = index;
        					const end = index + normalizedTerm.length;

        					if (wholeWord && !isWordBoundary(lowerText, start, end)) {
            					index++;
            					continue;
        					}

        					if (start > lastIndex) {
            					frag.appendChild(
            					    document.createTextNode(text.slice(lastIndex, start))
            					);
        					}

        					const mark = document.createElement("span");
        					mark.textContent = text.slice(start, end);
        					mark.className = previewMode
        					    ? "highlight preview"
        					    : "highlight";

        					frag.appendChild(mark);
        					results.push(mark);

        					lastIndex = end;
        					index = end;
    					}

					} else {

    					const regex = /\b[\p{L}\p{N}_]+\b/gu;

    					let match;

    					while ((match = regex.exec(lowerText)) !== null) {

        					const candidate = match[0];

        					if (Math.abs(candidate.length - normalizedTerm.length) > maxDist) {
        					    continue;
        					}

        					const dist = levenshtein(candidate, normalizedTerm);

        					if (
    							dist > maxDist &&
							    !matchesWithOneInsertion(candidate, normalizedTerm)
							) {
							    continue;
							}

        					const start = match.index;
        					const end = start + candidate.length;

        					if (start > lastIndex) {
            					frag.appendChild(
                					document.createTextNode(text.slice(lastIndex, start))
            					);
        					}

        					const mark = document.createElement("span");
        					mark.textContent = text.slice(start, end);
        					mark.className = previewMode
        					    ? "highlight preview"
        					    : "highlight";

        					frag.appendChild(mark);
					        results.push(mark);
					
					        lastIndex = end;
					    }
					}

                    frag.appendChild(
                        document.createTextNode(text.slice(lastIndex))
                    );

                    parent.replaceChild(frag, node);

                } else if (node.nodeType === 1) {
                    if (node.tagName !== "SCRIPT" && node.tagName !== "STYLE") {
                        Array.from(node.childNodes).forEach(walk);
                    }
                }
            }

            walk(container);
        }

        function previewSearch(term) {

            isValidated = false;

            buildHighlights(term, true);

            if (results.length === 0) {
                message.textContent = "Aucun résultat";
                counter.textContent = "";
                return;
            }

            counter.textContent = `${results.length}`;
            message.textContent = "";
        }

        function validateSearch(term) {

            isValidated = true;

            buildHighlights(term, false);

            if (results.length === 0) {
                message.textContent = "Aucun résultat";
                counter.textContent = "";
                return;
            }

            currentIndex = 0;
            setActive(0);
        }

        function refreshSearch() {

            const term = input.value.trim();

            if (!term) {
                clearAll();
                return;
            }

            if (isValidated) {
                validateSearch(term);
            } else {
                previewSearch(term);
            }
        }

        function nextResult() {
            setActive(currentIndex + 1);
        }

        function prevResult() {
            setActive(currentIndex - 1);
        }

        input.addEventListener("input", () => {
            isValidated = false;
            refreshSearch();
        });

        input.addEventListener("keydown", (e) => {

            if (e.key === "Enter") {
                e.preventDefault();
                validateSearch(input.value.trim());
            }

            if (e.key === "ArrowDown") {
                e.preventDefault();
                nextResult();
            }

            if (e.key === "ArrowUp") {
                e.preventDefault();
                prevResult();
            }
        });

        button.addEventListener("click", () => {
            validateSearch(input.value.trim());
        });

        wholeWordCheckbox.addEventListener("change", refreshSearch);
        accentCheckbox.addEventListener("change", refreshSearch);

        input.addEventListener("focus", () => {
            if (input.value.trim()) {
                previewSearch(input.value.trim());
            }
        });

        input.addEventListener("blur", () => {
            if (!isValidated) {
                clearAll();
            }
        });

        searches[key] = {
            validateSearch,
            input
        };
    }

    // 🔥 Initialisation
    createSearch('general', 'searchInput-general', 'searchButton-general', 'counter-general', 'message-general', 1);
    createSearch('definitions', 'searchInput-definitions', 'searchButton-definitions', 'counter-definitions', 'message-definitions', 2);
    createSearch('code', 'searchInput-code', 'searchButton-code', 'counter-code', 'message-code', 3);

    // 🔥 FIX scroll
    const ids = {
        1: "general",
        2: "definitions",
        3: "code"
    };

    window.rechercheRapide = function(term, colonne, wholeWord = true) {
        const search = searches[colonne];
        if (!search) return;

        // 🔥 applique le paramètre "mots entiers uniquement"
        const wholeWordCheckbox = document.getElementById("whole-word-only");
        if (wholeWordCheckbox) {
            wholeWordCheckbox.checked = wholeWord;
        }

        // met à jour l’input visuellement
        if (search.input) {
            search.input.value = term;
        }

        // lance la recherche validée
        if (typeof search.validateSearch === "function") {
            search.validateSearch(term);
        }

        // 🔽 scroll vers la colonne avec offset
        const element = document.getElementById(colonne);
        if (element) {
            const yOffset = -20;
            const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;

            window.scrollTo({
                top: y,
                behavior: "smooth"
            });
        }
    };

});