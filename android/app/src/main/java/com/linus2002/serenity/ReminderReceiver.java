package com.linus2002.serenity;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/**
 * Where a reminder's alarm lands, and where the system says the clock moved
 * under it: a reboot, an app update, a new zone, the time being set, or exact
 * alarms being allowed. See {@link ReminderScheduler}.
 */
public class ReminderReceiver extends BroadcastReceiver {

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();
        if (action == null) return;

        if (ReminderScheduler.ACTION_FIRE.equals(action)) {
            String group = intent.getStringExtra("group");
            String key = intent.getStringExtra("key");
            if (group != null && key != null) ReminderScheduler.fire(context, group, key);
            return;
        }

        switch (action) {
            case Intent.ACTION_BOOT_COMPLETED:
            case Intent.ACTION_MY_PACKAGE_REPLACED:
            case Intent.ACTION_TIMEZONE_CHANGED:
            case Intent.ACTION_TIME_CHANGED:
            case "android.app.action.SCHEDULE_EXACT_ALARM_PERMISSION_STATE_CHANGED":
                ReminderScheduler.rearmAll(context);
                break;
            default:
                break;
        }
    }
}
