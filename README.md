# urban-pong-spectrum-2019

## Contents

* urbanpong-pi - code that runs on the Raspberry Pi. Imported from https://bitbucket.org/rkerndt/urbanpong-pi
* spectrum/htdocs - code the runs in the user's mobile browser, provides the UI
* spectrum/server - node.js/express app that accepts requests from the browser clients and publishes MQTT messages to direct the light strip animations
* mock-ws-display - prototype browser-based mock "display" which accepts an array of rgb values over a websocket connection and renders them as a 60fps-ish animation

## UX/UI (as defined at the 2019 Hack-for-a-cause event)

* (Source, and deliverables)[https://drive.google.com/drive/folders/1QAaZdae8Sau7kXBd7doB3cChISsqmx9x]
* Includes following:
  - BRAND ASSETS - This folder contains the Logo PNG files (saved at 72ppi), Logo SVG files, a color guide, and the native Illustrator file. A PDF and a native Illrustrator file for the QR Code Sign is provided.
  - ONBOARDING SCREEN - This folder provides a PDF of possible Game Instruction text, a PDF of the UI for onboarding after QR code is scanned. Also, I provide the native Adobe XD file for the UI Onboard screen.
  - T-SPECTRUM INTERACTIVE ASSETS - SVG files of various interactive pieces for the application, including the color wheel, the color picker, launch track, the launch button, thumb arrows, button to allow players to save mixed color grid at game end.
  - USER VISUAL FLOW DOCUMENT - A PDF containing the User Interface for the game, starting with the sidewalk sign, the inital onboard, playing the game, and finally game ending.
  - USER FLOW DETAIL (Combined visual and explanation walk-through) - A PDF walking you through the steps in which players would play the game.
