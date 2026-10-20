# 🏘️ NearHelp Community Onboarding & Emergency Drills Playbook

This playbook provides step-by-step guidance for community coordinators, residential welfare associations (RWAs), university campuses, and neighborhood leads on onboarding members and executing successful emergency safety drills.

---

## 1. Establishing a Verified Community

### Step 1: Create the Community
- Community Coordinator registers an account and taps **Create Community**.
- Define community boundaries:
  - **Center Coordinate**: Physical center of the campus / residential cluster.
  - **Radius (m)**: Standard radius is 500m to 2,000m (covers walkable area within 3–10 minutes).
- System issues a unique **8-Character Invite Code** (e.g. `GV728A`).

### Step 2: Member Verification & Approval Queue
- Residents join via the Invite Code.
- All new members enter a **Pending** status.
- Coordinators verify resident identity (apartment number, student ID, resident directory) via the **Admin Panel** (`/communities`) or mobile app.
- Approved members gain the ability to toggle **Available** status and receive emergency alerts.

---

## 2. Emergency Response Roles

| Role | Responsibilities | Permissions |
|------|------------------|-------------|
| **Admin** | System configuration, coordinator management, member bans | Full control |
| **Coordinator** | Resident verification, drill scheduling, incident resolve | Approve members, resolve alerts |
| **Member** | Availability toggle, nearby helper, SOS caller | Alert responders, accept alerts |

---

## 3. Running Community Safety Drills (Milestone 12)

Safety drills train community members to react promptly and test connectivity without causing panic.

### Safety Rules for Drills
1. **Prominent Drill Banner**: All drill notifications and mobile screens display:
   > `⚠️ DRILL — This is not a real emergency`
2. **Pre-Announcement**: Inform residents 24 hours prior via noticeboard, WhatsApp, or community announcements.
3. **Never Obstruct 112**: Drills must never dial or interfere with real emergency dispatch services (112).
4. **Volunteer Safety**: Responders must never run dangerously or put themselves at physical risk during a drill.

### Drill Execution Workflow
```
[Coordinator toggles "Drill Mode"] ➔ [Presses SOS Button] ➔ [5-Second Countdown Window]
                                                                      │
                                                                      ▼
[Responders receive yellow drill alert] ➔ [Responders tap "Accept"] ➔ [Responders walk to location]
                                                                      │
                                                                      ▼
                                       [Coordinator taps "Resolve" & submits feedback rating]
```

### Measuring Drill Success
After resolving the drill, review metrics in the Admin Panel (`/` and `/incidents`):
- **Acceptance Time**: Target < 60 seconds from drill trigger.
- **First Arrival Time**: Target < 5 minutes for walkable residential clusters.
- **Participation Rate**: Target ≥ 20% of approved available members responding.

---

## 4. Moderation & Strike System

NearHelp upholds a zero-tolerance policy for abuse, harassment, or false alarms:
- **1 Strike**: Formal warning issued via Admin Panel.
- **2 Strikes**: Final warning with temporary availability suspension.
- **3 Strikes**: **Automated Ban** across all communities (`status = 'banned'`).

---

## 5. Privacy & Data Minimization Guarantees

- **No Continuous Tracking**: Background GPS is only collected while the user is toggled **Available** or during an **Active SOS**.
- **Instant Responder Privacy**: Responder live locations are nullified **immediately** when an incident is resolved or cancelled.
- **30-Day Retention**: Incident locations are purged after 30 days by the automated privacy retention worker.
