# **AegisRoute**

### *“Walk smarter, not just faster.”*

AegisRoute is a premium smart navigation platform designed to enhance travel confidence for women. Instead of relying only on the traditional *shortest-path* logic, AegisRoute evaluates real-world safety signals such as infrastructure density, business activity zones, and emergency access points to recommend smarter and safer routes.

**Live Application:**
[https://aegisroute.vercel.app/](https://aegisroute.vercel.app/)

---

# **Features**

###Smart Multi-Route Selection

Fetches and classifies up to three route alternatives:

* **Safest Route**
* **Neutral Route**
* **Shortest Route**

---

### Advanced Safety Algorithm

Implements **Multi-Point Safety Sampling** (3–5 checkpoints along each route) to evaluate:

* Police station proximity
* Business density (cafés, pharmacies, retail stores)
* Hospital accessibility

Routes are ranked based on aggregated safety indicators.

---

### LiquidEther Landing Experience

High-impact interactive shader-based fluid animation background with **GSAP-powered shuffle branding**, creating a premium first impression.

---

### Crisis Management Module

Dedicated emergency interface featuring:

* One-click WhatsApp location sharing
* SMS location sharing
* Direct emergency calling
* Custom emergency contact management

---

#**Tech Stack**

### Frontend

* React (TypeScript)
* Vite
* Tailwind CSS

### Animations

* Framer Motion
* GSAP (LiquidEther & Shuffle components)

### Mapping & APIs

* Google Maps JavaScript API
* Google Directions API
* Google Places API
* Google Geocoding API

### State Management

* React Hooks
* Modular Service Architecture

---

#**Architecture**

The application follows a modular, component-based architecture designed for:

* High performance rendering
* Clean separation of logic
* Scalable service integration
* Maintainable code structure

Key Modules:

* Route Engine
* Safety Evaluation Service
* Emergency Management Module
* Map Visualization Layer
* UI & Animation Layer

---

#**Installation & Setup**

## Prerequisites

* Node.js installed
* A valid Google Maps API Key with:

  * Maps JavaScript API enabled
  * Places API enabled
  * Directions API enabled

---

## Installation

```bash
git clone https://github.com/Adit012hya/AegisRoute.git
cd AegisRoute
npm install
```

---

## Environment Configuration

Create a `.env` file in the root directory:

```env
VITE_GOOGLE_MAPS_API_KEY=your_api_key_here
```

⚠️ Do not commit your `.env` file.

---

## Run the Project

```bash
npm run dev
```

The app will run at:

```
http://localhost:5173
```

---

## Build for Production

```bash
npm run build
```

Output folder:

```
dist/
```

---

#**Screenshots**

### Landing Page – LiquidEther Interactive Entry

![Landing](https://github.com/user-attachments/assets/411f5fd3-7a6d-40eb-a798-ceb9abd20eb3)

---

### Dashboard – 70/30 Map & Route Panel

![Dashboard](https://github.com/user-attachments/assets/271efcaa-81b1-42d0-a2fa-b0782dac0e34)

---

### Emergency Modal – SOS & Contact Interface

![Emergency](https://github.com/user-attachments/assets/ed6edeaa-4e85-4d5f-a9ef-b3048aee0308)

---

### Settings – Contact Management

![Settings](https://github.com/user-attachments/assets/454a0237-118a-477f-ab1d-bc868f9a29fe)

---

# **Demo Video**

Watch the full demo here:

[https://youtu.be/0z5h0_8Ghqg](https://youtu.be/0z5h0_8Ghqg)

---

# **Team Members**

* **Ranjana K P**
* **Adithya M**

---

# **License**

Distributed under the **MIT License**.
See the `LICENSE` file for more information.

---

