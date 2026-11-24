package com.linus2002.serenity;

import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;
import java.util.Calendar;
import java.util.Locale;
import java.util.TimeZone;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * The reminders and scheduled sessions, kept as rules ("07:00 every day")
 * rather than as a list of fixed moments.
 *
 * Only the next occurrence of each rule is ever handed to the alarm service.
 * When it fires, the notification is shown and the one after it is armed, so a
 * reminder never runs out however long the app goes unopened. Every occurrence
 * is worked out in the phone's zone at that moment, and everything is armed
 * again after a reboot, a change of zone or a change of clock, so 07:00 stays
 * 07:00 wherever the phone has travelled.
 *
 * Alarms are exact when the phone allows it. Otherwise they are the inexact
 * kind that still wakes an idle phone, which Android delivers within an hour.
 */
final class ReminderScheduler {

    static final String ACTION_FIRE = "com.linus2002.serenity.REMINDER";
    static final String EXTRA_URL = "serenity.reminderUrl";

    private static final String PREFS = "serenity_reminders";
    private static final String GROUP_PREFIX = "group.";
    private static final String FIRED = "fired";
    private static final String CHANNEL_ID = "reminders";
    /** Notification ids, clear of the background sound card and the notification plugin's. */
    private static final int NOTIFICATION_BASE = 60000;
    /** How far ahead a rule is searched: a weekly rule needs seven days, this is plenty. */
    private static final int SEARCH_DAYS = 400;

    static final String[] GROUPS = { "reminders", "schedule" };

    private ReminderScheduler() {}

    // ------------------------------------------------------------------ storage

    private static SharedPreferences prefs(Context context) {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    static JSONArray readGroup(Context context, String group) {
        try {
            return new JSONArray(prefs(context).getString(GROUP_PREFIX + group, "[]"));
        } catch (JSONException error) {
            return new JSONArray();
        }
    }

    private static JSONObject readFired(Context context) {
        try {
            return new JSONObject(prefs(context).getString(FIRED, "{}"));
        } catch (JSONException error) {
            return new JSONObject();
        }
    }

    private static void markFired(Context context, String key, String dateKey) {
        JSONObject fired = readFired(context);
        try {
            fired.put(key, dateKey);
        } catch (JSONException ignored) {
            return;
        }
        prefs(context).edit().putString(FIRED, fired.toString()).apply();
    }

    // ------------------------------------------------------------------ the rules

    /** The zone as the system has it now, not as this process first read it. */
    private static TimeZone zone() {
        TimeZone.setDefault(null);
        return TimeZone.getDefault();
    }

    static String dateKey(long millis) {
        Calendar cal = Calendar.getInstance(zone());
        cal.setTimeInMillis(millis);
        return String.format(Locale.US, "%04d-%02d-%02d",
            cal.get(Calendar.YEAR), cal.get(Calendar.MONTH) + 1, cal.get(Calendar.DAY_OF_MONTH));
    }

    private static int[] parseTime(String time) {
        try {
            String[] parts = time.trim().split(":");
            int hours = Integer.parseInt(parts[0]);
            int minutes = Integer.parseInt(parts[1]);
            if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
            return new int[] { hours, minutes };
        } catch (RuntimeException error) {
            return null;
        }
    }

    /** Day of week (Calendar.SUNDAY ...) of a `YYYY-MM-DD` date. */
    private static int weekdayOf(String dateKey) {
        String[] parts = dateKey.split("-");
        Calendar cal = Calendar.getInstance(zone());
        cal.clear();
        cal.set(Integer.parseInt(parts[0]), Integer.parseInt(parts[1]) - 1, Integer.parseInt(parts[2]), 12, 0);
        return cal.get(Calendar.DAY_OF_WEEK);
    }

    private static boolean occursOn(JSONObject alarm, Calendar day, String key) {
        String start = alarm.optString("date", "");
        if (!start.isEmpty() && key.compareTo(start) < 0) return false;
        String repeat = alarm.optString("repeat", "daily");
        int weekday = day.get(Calendar.DAY_OF_WEEK);
        switch (repeat) {
            case "once":
                return key.equals(start);
            case "weekdays":
                return weekday != Calendar.SATURDAY && weekday != Calendar.SUNDAY;
            case "weekly":
                return !start.isEmpty() && weekday == weekdayOf(start);
            default:
                return true;
        }
    }

    /**
     * The first occurrence after `after` (or, with `before`, the last at or
     * before it), or -1. Fields are set on a calendar in the current zone, so
     * the wall-clock time holds across daylight saving; a time skipped by the
     * spring change comes out an hour later rather than not at all.
     */
    private static long occurrence(JSONObject alarm, long after, boolean before) {
        int[] time = parseTime(alarm.optString("time", ""));
        if (time == null) return -1;
        Calendar day = Calendar.getInstance(zone());
        day.setTimeInMillis(after);
        for (int offset = 0; offset < SEARCH_DAYS; offset++) {
            Calendar at = (Calendar) day.clone();
            at.add(Calendar.DAY_OF_MONTH, before ? -offset : offset);
            at.set(Calendar.HOUR_OF_DAY, time[0]);
            at.set(Calendar.MINUTE, time[1]);
            at.set(Calendar.SECOND, 0);
            at.set(Calendar.MILLISECOND, 0);
            String key = String.format(Locale.US, "%04d-%02d-%02d",
                at.get(Calendar.YEAR), at.get(Calendar.MONTH) + 1, at.get(Calendar.DAY_OF_MONTH));
            if (!occursOn(alarm, at, key)) {
                if (before && "once".equals(alarm.optString("repeat")) && key.compareTo(alarm.optString("date", "")) < 0) return -1;
                continue;
            }
            long millis = at.getTimeInMillis();
            if (before ? millis <= after : millis > after) return millis;
        }
        return -1;
    }

    // ------------------------------------------------------------------ arming

    private static Intent fireIntent(Context context, String group, String key) {
        // The data address is what makes each alarm its own PendingIntent.
        return new Intent(context, ReminderReceiver.class)
            .setAction(ACTION_FIRE)
            .setData(new Uri.Builder().scheme("serenity-reminder").authority(group).appendPath(key).build())
            .putExtra("group", group)
            .putExtra("key", key);
    }

    private static PendingIntent firePending(Context context, String group, String key, int flags) {
        return PendingIntent.getBroadcast(context, 0, fireIntent(context, group, key), flags | PendingIntent.FLAG_IMMUTABLE);
    }

    static boolean canExact(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return true;
        AlarmManager alarms = context.getSystemService(AlarmManager.class);
        return alarms != null && alarms.canScheduleExactAlarms();
    }

    private static void arm(Context context, String group, String key, long at) {
        AlarmManager alarms = context.getSystemService(AlarmManager.class);
        if (alarms == null) return;
        PendingIntent pending = firePending(context, group, key, PendingIntent.FLAG_UPDATE_CURRENT);
        try {
            if (canExact(context)) {
                alarms.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pending);
            } else {
                alarms.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pending);
            }
        } catch (SecurityException error) {
            // Exact permission withdrawn between the check and the call.
            alarms.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pending);
        }
    }

    private static void disarm(Context context, String group, String key) {
        AlarmManager alarms = context.getSystemService(AlarmManager.class);
        PendingIntent pending = firePending(context, group, key, PendingIntent.FLAG_NO_CREATE);
        if (alarms != null && pending != null) {
            alarms.cancel(pending);
            pending.cancel();
        }
    }

    /**
     * Arms the next occurrence of one rule. With `catchUp`, an occurrence missed
     * a moment ago (the phone was off, or the clock jumped past it) and never
     * shown is shown now instead, if it is still within the rule's lateness.
     */
    private static void armNext(Context context, String group, JSONObject alarm, boolean catchUp, long now) {
        String key = alarm.optString("key", "");
        if (key.isEmpty()) return;
        if (catchUp) {
            long previous = occurrence(alarm, now, true);
            long late = alarm.optLong("lateMinutes", 30) * 60_000L;
            if (previous > 0 && now - previous <= late
                && !dateKey(previous).equals(readFired(context).optString(key, ""))) {
                arm(context, group, key, now + 5_000L);
                return;
            }
        }
        long next = occurrence(alarm, now, false);
        if (next > 0) arm(context, group, key, next);
        else disarm(context, group, key);
    }

    /** Replaces one group's rules, from the app. */
    static void setGroup(Context context, String group, JSONArray alarms) {
        JSONArray previous = readGroup(context, group);
        JSONObject before = new JSONObject();
        for (int i = 0; i < previous.length(); i++) {
            JSONObject old = previous.optJSONObject(i);
            if (old == null) continue;
            disarm(context, group, old.optString("key", ""));
            try {
                before.put(old.optString("key", ""), old.optString("time") + "|" + old.optString("repeat") + "|" + old.optString("date"));
            } catch (JSONException ignored) {}
        }
        prefs(context).edit().putString(GROUP_PREFIX + group, alarms.toString()).apply();

        long now = System.currentTimeMillis();
        for (int i = 0; i < alarms.length(); i++) {
            JSONObject alarm = alarms.optJSONObject(i);
            if (alarm == null) continue;
            String key = alarm.optString("key", "");
            String rule = alarm.optString("time") + "|" + alarm.optString("repeat") + "|" + alarm.optString("date");
            // Only a rule that was already set may catch up. One switched on just
            // now has missed nothing, and one whose time just changed starts afresh.
            armNext(context, group, alarm, rule.equals(before.optString(key, null)), now);
        }
    }

    /** Arms everything again: after a reboot, an update, or a change of zone or clock. */
    static void rearmAll(Context context) {
        long now = System.currentTimeMillis();
        for (String group : GROUPS) {
            JSONArray alarms = readGroup(context, group);
            for (int i = 0; i < alarms.length(); i++) {
                JSONObject alarm = alarms.optJSONObject(i);
                if (alarm != null) armNext(context, group, alarm, true, now);
            }
        }
    }

    // ------------------------------------------------------------------ firing

    /** An alarm went off: show it, then arm the one after. */
    static void fire(Context context, String group, String key) {
        JSONArray alarms = readGroup(context, group);
        JSONObject alarm = null;
        int index = -1;
        for (int i = 0; i < alarms.length(); i++) {
            JSONObject candidate = alarms.optJSONObject(i);
            if (candidate != null && key.equals(candidate.optString("key"))) {
                alarm = candidate;
                index = i;
                break;
            }
        }
        // Removed since it was armed.
        if (alarm == null) return;

        long now = System.currentTimeMillis();
        // The occurrence this is for: an inexact alarm can land after midnight.
        long due = occurrence(alarm, now + 60_000L, true);
        String day = dateKey(due > 0 ? due : now);
        if (!day.equals(readFired(context).optString(key, ""))) {
            markFired(context, key, day);
            show(context, group, index, alarm, day);
        }
        // From a minute past the occurrence, so the same one is never armed again.
        armNext(context, group, alarm, false, Math.max(now, due) + 60_000L);
    }

    private static void show(Context context, String group, int index, JSONObject alarm, String day) {
        if (!NotificationManagerCompat.from(context).areNotificationsEnabled()) return;
        createChannel(context);

        JSONObject bodies = alarm.optJSONObject("bodies");
        String body = bodies != null && bodies.has(day) ? bodies.optString(day) : alarm.optString("body", "");
        String url = alarm.optString("url", "/home");

        Intent open = new Intent(context, MainActivity.class)
            .setAction(Intent.ACTION_VIEW)
            .setData(new Uri.Builder().scheme("serenity-open").appendPath(alarm.optString("key")).build())
            .addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP)
            .putExtra(EXTRA_URL, url);
        PendingIntent tap = PendingIntent.getActivity(context, 0, open, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);

        Notification notification = new NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_stat_serenity)
            .setColor(ContextCompat.getColor(context, R.color.background_sound_tint))
            .setContentTitle(alarm.optString("title", "Serenity"))
            .setContentText(body)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
            .setContentIntent(tap)
            .setAutoCancel(true)
            .setCategory(NotificationCompat.CATEGORY_REMINDER)
            .build();
        int base = "schedule".equals(group) ? NOTIFICATION_BASE + 1000 : NOTIFICATION_BASE;
        try {
            NotificationManagerCompat.from(context).notify(base + Math.max(0, index), notification);
        } catch (SecurityException error) {
            // Notifications withdrawn: nothing to show.
        }
    }

    private static void createChannel(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager manager = context.getSystemService(NotificationManager.class);
        if (manager == null || manager.getNotificationChannel(CHANNEL_ID) != null) return;
        NotificationChannel channel = new NotificationChannel(
            CHANNEL_ID,
            context.getString(R.string.reminder_channel),
            NotificationManager.IMPORTANCE_DEFAULT
        );
        channel.setDescription(context.getString(R.string.reminder_channel_description));
        manager.createNotificationChannel(channel);
    }
}
