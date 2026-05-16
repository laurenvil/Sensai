"use client";

import Link from "next/link";
import {
  BookOpen,
  CheckCircle,
  Lock,
  Clock,
  Users,
  Award,
} from "lucide-react";

const MODULES = [
  {
    slug: "module-01-welcome",
    title: "Module 01 — Welcome to Arduino",
    description:
      "Hello World, basic Serial communication, and setting up your Arduino Learning Contract.",
    status: "available" as const,
    topics: ["void setup()", "void loop()", "Serial.begin()", "Learning Contract"],
    grading: { mastery: 50, contract: 25, community: 25 },
    estimatedTime: "2-3 hours",
  },
  {
    slug: "module-02-circuits",
    title: "Module 02 — Basic Circuits & LEDs",
    description:
      "Understanding GPIO, logic levels (3.3V), resistors, and blinking LEDs.",
    status: "available" as const,
    topics: ["GPIO", "pinMode", "digitalWrite", "Breadboards"],
    grading: { mastery: 50, circuit: 25, community: 25 },
    estimatedTime: "3-4 hours",
  },
  {
    slug: "module-03-logic",
    title: "Module 03 — Digital Logic & Buttons",
    description:
      "Reading digital inputs, debouncing, and conditional logic.",
    status: "available" as const,
    topics: ["digitalRead", "If/Else", "Debouncing", "Pull-up resistors"],
    grading: { mastery: 50, project: 25, community: 25 },
    estimatedTime: "3-4 hours",
  },
  {
    slug: "module-04-analog",
    title: "Module 04 — Analog & PWM",
    description:
      "Reading potentiometers and fading LEDs using Pulse Width Modulation.",
    status: "available" as const,
    topics: ["analogRead", "analogWrite", "PWM", "Map function"],
    grading: { mastery: 50, project: 25, community: 25 },
    estimatedTime: "3-4 hours",
  },
  {
    slug: "module-05-sensors",
    title: "Module 05 — Environmental Sensors",
    description:
      "Integrating temperature, humidity, and light sensors.",
    status: "coming-soon" as const,
    topics: ["Libraries", "Data types", "Sensors"],
    grading: {},
    estimatedTime: "TBD",
  },
  {
    slug: "module-06-serial",
    title: "Module 06 — Advanced Serial Comm",
    description:
      "Parsing complex serial data and building a desktop-to-Arduino interface.",
    status: "coming-soon" as const,
    topics: ["Serial.parseInt", "Parsing Strings", "Data Protocols"],
    grading: {},
    estimatedTime: "TBD",
  },
  {
    slug: "module-07-actuators",
    title: "Module 07 — Actuators & Motors",
    description:
      "Driving servos, DC motors, and understanding relays.",
    status: "coming-soon" as const,
    topics: ["Servo.h", "Motor drivers", "External power"],
    grading: {},
    estimatedTime: "TBD",
  },
  {
    slug: "module-08-i2c",
    title: "Module 08 — I2C & Displays",
    description:
      "Communicating with OLED displays and external EEPROM using I2C.",
    status: "coming-soon" as const,
    topics: ["Wire.h", "I2C Addresses", "OLED graphics"],
    grading: {},
    estimatedTime: "TBD",
  },
  {
    slug: "module-09-iot",
    title: "Module 09 — WiFi & IoT",
    description:
      "Connecting to networks and making HTTP requests.",
    status: "coming-soon" as const,
    topics: ["WiFi.h", "HTTP GET/POST", "APIs"],
    grading: {},
    estimatedTime: "TBD",
  },
  {
    slug: "module-10-capstone",
    title: "Module 10 — Capstone Project",
    description:
      "Design, build, and document an end-to-end original hardware project.",
    status: "coming-soon" as const,
    topics: ["Project planning", "Hardware architecture", "Peer Review"],
    grading: {},
    estimatedTime: "TBD",
  },
];

export default function CoursesPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Course Modules
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Work through modules at your own pace. Each module includes starter
          code, AutoGrading, and peer review.
        </p>
      </div>

      {/* Grading overview */}
      <div className="mt-6 flex flex-wrap gap-4">
        <div className="flex items-center gap-2 rounded-full bg-indigo-50 px-4 py-1.5 text-sm text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
          <Award className="h-4 w-4" />
          100 pts per module
        </div>
        <div className="flex items-center gap-2 rounded-full bg-green-50 px-4 py-1.5 text-sm text-green-700 dark:bg-green-950 dark:text-green-300">
          <CheckCircle className="h-4 w-4" />
          AutoGraded via pytest
        </div>
        <div className="flex items-center gap-2 rounded-full bg-purple-50 px-4 py-1.5 text-sm text-purple-700 dark:bg-purple-950 dark:text-purple-300">
          <Users className="h-4 w-4" />
          Peer review required
        </div>
      </div>

      {/* Module Grid */}
      <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {MODULES.map((mod) => (
          <ModuleCard key={mod.slug} module={mod} />
        ))}
      </div>
    </div>
  );
}

function ModuleCard({
  module: mod,
}: {
  module: (typeof MODULES)[number];
}) {
  const isAvailable = mod.status === "available";

  return (
    <div
      className={`flex flex-col rounded-xl border bg-white dark:bg-gray-900 ${
        isAvailable
          ? "border-gray-200 dark:border-gray-800"
          : "border-gray-100 opacity-60 dark:border-gray-850"
      }`}
    >
      {/* Card header with gradient */}
      <div className="rounded-t-xl bg-gradient-to-r from-indigo-500 to-purple-600 p-4">
        <div className="flex items-center justify-between">
          <BookOpen className="h-6 w-6 text-white/80" />
          {isAvailable ? (
            <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-medium text-white">
              Available
            </span>
          ) : (
            <span className="flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-medium text-white/70">
              <Lock className="h-3 w-3" />
              Coming Soon
            </span>
          )}
        </div>
        <h3 className="mt-3 text-lg font-bold text-white">{mod.title}</h3>
      </div>

      {/* Card body */}
      <div className="flex flex-1 flex-col p-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {mod.description}
        </p>

        {/* Topics */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {mod.topics.map((topic) => (
            <span
              key={topic}
              className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-400"
            >
              {topic}
            </span>
          ))}
        </div>

        {/* Time estimate */}
        <div className="mt-3 flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
          <Clock className="h-3.5 w-3.5" />
          {mod.estimatedTime}
        </div>

        {/* Action */}
        <div className="mt-auto pt-4">
          {isAvailable ? (
            <Link
              href={`/courses/${mod.slug}`}
              className="block w-full rounded-lg bg-indigo-600 py-2 text-center text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
            >
              Start Module
            </Link>
          ) : (
            <div className="block w-full rounded-lg bg-gray-100 py-2 text-center text-sm font-medium text-gray-400 dark:bg-gray-800">
              Coming Soon
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
