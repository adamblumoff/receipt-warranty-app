# 📄 Product Design Document: Receipts & Warranties Vault (PoC)

## 1. Objective
Build a mobile app where a user can snap a photo of a receipt, have it stored securely, and automatically see the key purchase info. The system should send them a reminder when the associated warranty is about to expire.  

The PoC must validate:
- Users can capture/store receipts with **minimal friction**.  
- OCR can extract **basic fields** reliably (vendor, date, total).  
- Scheduled reminders fire successfully (push notification).  

---

## 2. Target Users
- Early adopters: students, young professionals, or households who make purchases but lose track of receipts/warranties.  
- Key behaviors: want an easy way to save receipts, don’t want to type anything, respond to reminders.  

---

## 3. Core Use Cases (PoC scope)
1. **Capture receipt**: Take a photo → upload → auto-store.  
2. **Auto-extract details**: OCR parses vendor, date, total; warranty defaults to “1 year from purchase” if not extracted.  
3. **View receipts list**: See all stored receipts with vendor, total, warranty date.  
4. **Reminder notifications**: Get push when warranty expiration is within 7 days.  

---

## 4. Out of Scope (for now)
- Multi-item line parsing.  
- Vendor normalization across users.  
- PDF/ZIP exports.  
- Categories/tags.  
- Cross-device syncing (we’ll focus on one device per user).  
- Sharing receipts with others.  

---

## 5. User Flow (happy path)
1. **Open app** → camera auto-opens.  
2. **Snap receipt photo** → app uploads to backend.  
3. **Backend OCR** (Convex action + Vision API) extracts vendor, date, total.  
4. **Record saved** in database: receipt + inferred warranty (purchaseDate + 1 year).  
5. **Timeline view** shows: Vendor, purchase date, total, warranty expiry.  
6. **Reminder job** (Convex cron) checks daily → if warranty expires in 7 days → push notification to user.  

---

## 6. Feature Set (PoC)

### Mobile (Expo)
- Camera capture (single photo).  
- List of receipts (vendor, total, expiry date).  
- Receipt detail screen (full photo + OCR’d text).  
- Push notifications (basic: “Warranty expiring soon”).  
- Auth: Clerk (email login only).  

### Backend (Convex)
- Tables: `receipts`, `warranties`, `users`.  
- Actions: `processReceipt(fileId)`.  
- Cron: `checkExpiringWarranties()`.  
- File storage: store images, return signed URLs.  

### OCR
- Google Vision API (cheap tier).  
- Parse: vendor (string), date (ISO), total (number).  
- Fallback: if parsing fails, still store photo (manual input later).

---

## 7. Success Metrics
PoC is successful if:  
- **Capture-to-listing flow works in <10 seconds.**  
- OCR extracts date + total correctly in **≥70% of cases**.  
- Daily cron fires and triggers Expo push notifications reliably.  
- At least 3–5 users try it and confirm it reduces their friction compared to “just saving a photo in camera roll.”  

---

## 8. Technical Stack
- **Frontend:** Expo (React Native, TypeScript), NativeWind for styling.  
- **Backend:** Convex (TypeScript).  
- **Auth:** Clerk (email).  
- **OCR:** Google Vision API via Convex action.  
- **Push:** Expo Notifications API.  
- **Storage:** Convex File Storage.  

---

## 9. Risks & Mitigations
- **OCR misreads:** fallback is to store the image unstructured. Users can still view manually.  
- **Reminders fail:** during PoC, cross-check with logs daily.  
- **Privacy concerns:** reassure users with “Your data stays private, export anytime” messaging.  

---

## 10. Timeline (2 Weeks PoC)
- **Day 1–2:** Setup Expo app, Convex project, Clerk auth.  
- **Day 3–5:** Camera → upload to Convex file storage.  
- **Day 6–8:** Vision OCR + action to parse/save receipt/warranty.  
- **Day 9–10:** Build list & detail UI screens.  
- **Day 11–12:** Cron + push notifications.  
- **Day 13–14:** Bug fixes, polish demo flow, gather early feedback.  

---

## 11. Demo Script
- User opens app → camera → snap → “Receipt saved!”  
- Timeline updates: Vendor X, $Y, Warranty until 2026-02-01.  
- Show detail screen: photo + OCR text.  
- Trigger cron manually → push notification: “Your warranty for Vendor X is expiring soon.”  

---
