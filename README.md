# SceneTemple

SceneTemple is an offline desktop editor for screenplays, stage plays, video games, advertising, and social video. Start with a script format, write directly on the paginated manuscript, and export the active script to PDF or editable Word. A project can hold several scripts, each with its own template.

[Download SceneTemple](https://github.com/tfassih/SceneTemple/releases/latest)

## Install

| Computer | Download | Installation |
| --- | --- | --- |
| Windows 11, x64 | Windows Setup EXE | Run the installer, then open SceneTemple from Start. It installs for the current user. |
| macOS 12 Monterey or later, Intel | macOS Intel DMG | Open the disk image, then drag SceneTemple into Applications. |
| macOS 12 Monterey or later, Apple silicon | macOS Apple Silicon DMG | Open the disk image, then drag SceneTemple into Applications. |
| Ubuntu 24.04, x86-64 | Ubuntu amd64 DEB | Open the package with a Debian package installer or run `sudo apt install ./SceneTemple-1.0.0-Ubuntu-amd64.deb` in the download directory. |
| Portable | Portable ZIP | Extract the folder and open `index.html` in a desktop browser. PDF export uses the browser print dialog. |

The desktop installers contain the editor, runtime, fonts, and US English dictionary. Ubuntu uses the desktop libraries listed in the package dependencies. No account or internet connection is required to write, proofread, open projects, or export. The first release has no publisher certificate for Windows or Apple notarization. macOS builds are ad-hoc signed. Download release files from this repository. SHA-256 hashes accompany the installers.

## Write a script

1. Pick the medium, choose a template, and enter a project title. Check **Start with the example text** to explore a populated script.
2. Click the page and write. **Enter** starts the next logical element, **Tab** or **Shift+Tab** changes its type, and **Shift+Enter** adds a line inside it. Scene headings and common transitions are recognized in action paragraphs. Character cues and other uppercase elements format automatically.
3. Click an item in **Elements** to insert it after the selected element, or drag it above or below a paragraph. The selected-element controls can move, duplicate, or remove a block. **Save component** stores reusable names, locations, settings, cues, or A/V copy in the project.
4. Use **Project** and **Outline** to switch documents and jump through acts, scenes, shots, sections, or dialogue nodes. In a branching dialogue script, select a player choice and set its **Branch destination** in the Elements pane.
5. Open the project-name menu for **Project and script details**, title pages, **Add script**, or **Customize template**. A custom template records the current element sequence, paper size, spacing, capitalization, emphasis, alignment, indents, and the element Enter creates. It can include the current text. Select the saved template when adding another script to the same project.
6. **Proofread** checks the active script locally. Apply a replacement, add a term to the project dictionary, or ignore a suggestion. Usage checks cover repeated words, selected article and agreement errors, and common confusions. Dialogue may intentionally break these rules.
7. Press **F8** for full-screen focus mode and **Escape** to return. Use **Ctrl/Cmd+S** to save the complete project as a `.scenetemple` file. The startup screen offers recovery if a draft is left unsaved. Project files contain plain UTF-8 JSON, including custom libraries and proofing decisions.
8. **Export** produces the active document. PDF uses the on-screen page layout. Word embeds Courier Prime, uses editable text and native tables, and writes explicit wraps and page breaks. A Word processor can reflow a document after edits or font substitution.

## Templates

| Medium | Included templates |
| --- | --- |
| Film | Feature screenplay, numbered shooting script |
| Television | Single-camera teleplay, multi-camera sitcom |
| Stage | Modern US stage play |
| Video games | Cinematic screenplay, story bible, narrative design document, branching dialogue, quest or mission script, voiceover and barks |
| YouTube and social video | YouTube production script, short-form video |
| Advertising | Commercial A/V script |

The default US screenplay uses Letter paper, 12-point Courier Prime, 1½-inch left and 1-inch right margins, character and dialogue indents, and numbered continuation pages. Long dialogue includes continuation cues. Television and stage templates adapt the placement, case, and spacing. A/V formats keep visuals and audio in parallel columns. Game documentation, social, and commercial scripts use adaptable production conventions, which vary by team, show, or commissioning organization.

Formatting references include the [Academy Nicholl formatting guidance](https://www.oscars.org/sites/oscars/files/2022_nicholl_faq_1.pdf), [Dramatists Guild modern play example](https://www.dramatistsguild.com/sites/default/files/2019-12/modernformat-New.pdf), [AHRQ two-column shooting-script guide](https://www.ahrq.gov/sites/default/files/wysiwyg/research/publications/pubcomguide/Shooting-Script-How-to.pdf), and [inkle’s branching narrative documentation](https://github.com/inkle/ink/blob/master/Documentation/WritingWithInk.md). The example scripts are original.

## Develop and build

The renderer is plain JavaScript, HTML, and CSS. Electron supplies the native window, system file dialogs, local recovery storage, and PDF writer. The project model, format catalog, and pagination engine live in separate modules under `app/`. The renderer runs sandboxed with Node integration disabled. The native bridge validates the sending window and writes projects via temporary files and rename. Before overwriting an opened project it checks for external changes.

Use Node.js 24 and Python 3.12. The initial developer build retrieves a pinned CMUdict revision and compiles its word forms. Released installers and the portable ZIP carry the compiled dictionary. For local desktop development run `npm install`, then `npm start`. Run `npm test` for the model and pagination tests. For the offline browser edition run `node tools/prepare.cjs`, then open `app/index.html`.

Run `python tools/package.py` on the target OS to build and launch-test its installer. The script verifies the pinned upstream Electron archive. Native packaging tools are Inno Setup 6 on Windows, Xcode Command Line Tools and hdiutil on macOS, and dpkg-deb, unzip, and xvfb-run on Ubuntu. `python tools/package.py --portable` creates the browser ZIP. The release workflow builds on all four native targets and publishes after all platform tests pass. Update VERSION, package.json, and the release notes for a new version.

Electron 43 is pinned for Monterey compatibility. Electron 44 raised the minimum to macOS 13. [Electron compatibility notes](https://www.electronjs.org/docs/latest/breaking-changes/)

## Bundled assets

Courier Prime is distributed under the SIL Open Font License. The US English spelling lexicon is derived from Carnegie Mellon University’s CMU Pronouncing Dictionary. Its redistribution notice is included. JSZip is distributed with its upstream license. See `app/assets/*-LICENSE.txt`. Each native runtime distribution includes its Electron and Chromium notices.
