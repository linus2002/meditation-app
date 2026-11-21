package com.linus2002.serenity;

import android.content.Intent;
import android.os.Handler;
import android.os.Looper;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Lets the web layer say when a session or sound is under way, so the app can
 * stay alive with the screen off, and what it is, for the lock-screen player
 * card. The card's buttons come back as "mediaAction" events.
 * See {@link BackgroundSoundService}.
 */
@CapacitorPlugin(name = "BackgroundSound")
public class BackgroundSoundPlugin extends Plugin {

    private final Handler main = new Handler(Looper.getMainLooper());

    @Override
    public void load() {
        BackgroundSoundService.listener = (action, positionSeconds) -> {
            JSObject event = new JSObject();
            event.put("action", action);
            if (positionSeconds >= 0) event.put("position", positionSeconds);
            notifyListeners("mediaAction", event);
        };
    }

    /**
     * `holding`: something is under way, so keep the app and CPU awake.
     * `nowPlaying`: the card to show, or null for none. With neither, the
     * service stops and the card goes.
     */
    @PluginMethod
    public void update(PluginCall call) {
        boolean holding = Boolean.TRUE.equals(call.getBoolean("holding", false));
        JSObject info = call.getObject("nowPlaying", null);

        BackgroundSoundService.NowPlaying now = null;
        if (info != null) {
            now = new BackgroundSoundService.NowPlaying();
            now.title = info.getString("title", "Serenity");
            now.subtitle = info.getString("subtitle", "");
            now.artwork = info.getString("artwork", null);
            now.durationMs = Math.round(info.optDouble("duration", 0) * 1000);
            now.positionMs = Math.round(info.optDouble("position", 0) * 1000);
            now.playing = info.optBoolean("playing", false);
            now.canSeek = info.optBoolean("canSeek", false);
        }
        BackgroundSoundService.holding = holding;
        BackgroundSoundService.nowPlaying = now;

        if (!holding && now == null) {
            getContext().stopService(serviceIntent());
            call.resolve();
            return;
        }

        BackgroundSoundService running = BackgroundSoundService.instance;
        if (running != null) {
            main.post(running::refresh);
            call.resolve();
            return;
        }
        try {
            ContextCompat.startForegroundService(getContext(), serviceIntent());
            call.resolve();
        } catch (RuntimeException error) {
            // Android refuses this from the background. The app then simply has
            // no protection from being killed, as it had none before.
            call.reject("Could not start the background service", error);
        }
    }

    /** Kept for older web bundles: the same as update({ holding: true }). */
    @PluginMethod
    public void start(PluginCall call) {
        BackgroundSoundService.holding = true;
        try {
            ContextCompat.startForegroundService(getContext(), serviceIntent());
            call.resolve();
        } catch (RuntimeException error) {
            call.reject("Could not start the background service", error);
        }
    }

    /** Kept for older web bundles: ends everything. */
    @PluginMethod
    public void stop(PluginCall call) {
        BackgroundSoundService.holding = false;
        BackgroundSoundService.nowPlaying = null;
        getContext().stopService(serviceIntent());
        call.resolve();
    }

    private Intent serviceIntent() {
        return new Intent(getContext(), BackgroundSoundService.class);
    }
}
