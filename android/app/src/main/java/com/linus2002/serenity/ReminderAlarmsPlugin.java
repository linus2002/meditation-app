package com.linus2002.serenity;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import org.json.JSONException;

/**
 * Hands the reminder rules to {@link ReminderScheduler}, and passes a tapped
 * reminder's address back to the web layer as a "tap" event.
 */
@CapacitorPlugin(name = "ReminderAlarms")
public class ReminderAlarmsPlugin extends Plugin {

    @Override
    public void load() {
        // A tap that launched the app: kept until the web layer listens.
        if (getActivity() != null) deliverTap(getActivity().getIntent());
    }

    @Override
    protected void handleOnNewIntent(Intent intent) {
        super.handleOnNewIntent(intent);
        deliverTap(intent);
    }

    private void deliverTap(Intent intent) {
        if (intent == null) return;
        String url = intent.getStringExtra(ReminderScheduler.EXTRA_URL);
        if (url == null) return;
        // Once only, so turning the phone or returning to the app doesn't replay it.
        intent.removeExtra(ReminderScheduler.EXTRA_URL);
        JSObject event = new JSObject();
        event.put("url", url);
        notifyListeners("tap", event, true);
    }

    /** `group`: "reminders" or "schedule". `alarms`: that group's whole list. */
    @PluginMethod
    public void set(PluginCall call) {
        String group = call.getString("group", "");
        JSArray alarms = call.getArray("alarms", new JSArray());
        boolean known = false;
        for (String name : ReminderScheduler.GROUPS) known |= name.equals(group);
        if (!known) {
            call.reject("Unknown group");
            return;
        }
        try {
            ReminderScheduler.setGroup(getContext(), group, new org.json.JSONArray(alarms.toString()));
        } catch (JSONException error) {
            call.reject("Bad alarms", error);
            return;
        }
        call.resolve();
    }

    /** Whether reminders can arrive on the minute, or may be up to an hour late. */
    @PluginMethod
    public void timing(PluginCall call) {
        JSObject result = new JSObject();
        result.put("exact", ReminderScheduler.canExact(getContext()));
        result.put("canAsk", Build.VERSION.SDK_INT >= Build.VERSION_CODES.S);
        call.resolve(result);
    }

    /** Opens the system's "Alarms & reminders" switch for this app. */
    @PluginMethod
    public void openTimingSettings(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
            call.resolve();
            return;
        }
        try {
            Intent intent = new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM, Uri.parse("package:" + getContext().getPackageName()));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            call.resolve();
        } catch (RuntimeException error) {
            call.reject("Could not open settings", error);
        }
    }
}
