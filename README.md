Smart Rail is a user-centric train booking platform.
🚆 Smart Rail – Visual Train Seat Booking System

Smart Rail is a modern web-based train ticket booking platform that enhances traditional railway reservation systems by introducing visual seat selection, intelligent assistance, and accessibility-focused features.

Unlike conventional booking platforms that only display seat numbers, Smart Rail provides an interactive visual coach layout, allowing passengers to choose seats based on comfort, preference, and accessibility needs. 

SMART RAIL

The platform is designed to improve user experience, booking clarity, and decision-making during the train reservation process.

📌 Table of Contents

Overview

Problem Statement

Proposed Solution

Key Features

System Modules

Technology Stack

System Requirements

Database Design

Installation & Setup

Project Structure

Future Improvements

Team Members

📖 Overview

Railway booking platforms such as IRCTC primarily rely on text-based seat allocation, which limits the user's ability to select seats according to their preference.

Smart Rail solves this issue by introducing:

Visual seat maps

Comfort-based seat selection

AI-powered assistance

Complaint tracking system

Accessibility features for senior and special passengers

The system focuses on delivering a user-centric and efficient train reservation experience. 

SMART RAIL

⚠️ Problem Statement

Current railway booking systems have several limitations:

Lack of visual seat layout representation

No comfort-based seat recommendation

Limited AI assistance during booking

Poor complaint tracking systems

Lack of accessibility features for senior citizens and special passengers

These limitations make the booking experience less intuitive and less user-friendly. 

SMART RAIL

💡 Proposed Solution

Smart Rail addresses these problems by providing:

Interactive coach and seat visualization

Priority seating suggestions for elderly passengers

Co-passenger based recommendations

AI chatbot assistance during booking

Admin dashboard for system management

This approach improves clarity, accessibility, and user satisfaction during ticket booking. 

SMART RAIL

✨ Key Features
🎟 Train Search

Search trains by source and destination

View train schedules with arrival and departure times

🪑 Visual Seat Selection

Interactive coach layout

Color-coded seat availability

Easy seat selection

🎫 Ticket Management

Book tickets

View booking history

Cancel tickets

🤖 AI Chatbot

Helps users search trains

Provides seat suggestions

Answers booking queries

📊 Waiting List Prediction

Predicts probability of waiting list confirmation

🧾 Complaint System

Users can register complaints

Track complaint status

👨‍💼 Admin Dashboard

Manage trains and seat layouts

Monitor bookings

Handle complaints

🧩 System Modules

1 **User Module**

Handles passenger interaction with the system.

Functions include:

User registration and login

Train search and schedule viewing

Visual seat selection

Ticket booking and cancellation

Booking history

Complaint registration and tracking

2️ **Admin Module**

Allows administrators to manage the system.

Functions include:

Admin authentication

Train management

Seat layout management

Booking monitoring

Complaint resolution

3️ **AI Module**

Enhances the system with intelligent support.

Functions include:

AI chatbot assistance

Seat recommendations

Waiting list prediction

Co-passenger based suggestions

🛠 **Technology Stack**

**Frontend**

• HTML

• CSS

 •React

• Tailwind CSS

• Vite

**Backend**

• Node.js

• Express.js

• REST API

**Database**

• Supabase

• PostgreSQL

**Authentication**

Firebase Authentication


💻** System Requirements**

**Hardware**

• Laptop or Desktop Computer

• Minimum 4 GB RAM

• Stable Internet Connection

**Software**

• Modern Web Browser (Chrome / Edge / Firefox)

• Node.js

• npm

🗄 Database Design

The system includes the following main database tables:
| Table      | Description                               |
| ---------- | ----------------------------------------- |
| Users      | Stores user account information           |
| Trains     | Contains train route and schedule details |
| Coaches    | Coach layout configuration                |
| Seats      | Seat availability and type                |
| Bookings   | Ticket booking records                    |
| Passengers | Passenger details                         |
| Reviews    | Train comfort reviews                     |
| Complaints | User complaints and status                |
| Admin      | Administrator credentials                 |


⚙️ Installation & Setup
1. Clone the Repository
git clone https://github.com/your-username/smart-rail.git
2. Navigate to the Project Folder
cd smart-rail
3. Install Dependencies
npm install
4. Start the Backend Server
node server.js
5. Start the Frontend
npm run dev
