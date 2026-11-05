import SwiftUI

/// One home screen: the streak and the daily counters.
struct HomeView: View {
    @EnvironmentObject var store: CountStore
    @EnvironmentObject var pro: ProStore
    @Environment(\.openURL) private var openURL
    @State private var showPacer = false
    @State private var showPaywall = false
    @State private var showLight = false
    @State private var confirmLastBite = false
    @State private var showMeal = false
    @State private var showTrends = false
    @State private var showChewNumber = false
    @State private var chewOfferPending = ChewNumberStore().offerPending
    @State private var chewResults = ChewNumberStore().load()

    /// The meal log changes on other screens, so Home re-reads it whenever they close.
    @State private var mealLogUsed = FreeMealRule.isUsed(meals: MealStore().load())
    private var freeMealLeft: Bool { !pro.isPro && !mealLogUsed }
    private func refreshMealLog() { mealLogUsed = FreeMealRule.isUsed(meals: MealStore().load()) }

    var body: some View {
        NavigationStack {
            List {
                Section {
                    StreakCard(streak: store.streak, longest: store.longestStreak,
                               todayAnswer: store.todayAnswer, missedYesterday: store.missedYesterday,
                               answer: { store.answerToday(hit: $0) })
                }
                if store.showNextDoor {
                    Section {
                        NextDoorCard(
                            take: {
                                Analytics.shared.track(.nextDoorTapped)
                                store.dismissNextDoor()
                                openURL(AboutContent.nextDoorLink)
                            },
                            notNow: { store.dismissNextDoor() }
                        )
                        .onAppear {
                            if store.markNextDoorShown() { Analytics.shared.track(.nextDoorShown) }
                        }
                    }
                }
                Section {
                    if chewOfferPending {
                        ChewNumberOfferCard(
                            take: { answerChewOffer(); showChewNumber = true },
                            notNow: { answerChewOffer() }
                        )
                    } else {
                        CounterRow(icon: "number", title: ChewNumberCopy.title,
                                   subtitle: "One bite, about a minute. Free.",
                                   value: chewResults.latest.map(String.init) ?? "", tint: .red) {
                            showChewNumber = true
                        }
                    }
                }
                Section("Today's counts") {
                    CounterRow(icon: "fork.knife", title: "Bite Pacer",
                               value: "32 chews", tint: .orange) { showPacer = true }
                    CounterRow(icon: "figure.walk", title: "Steps",
                               subtitle: !store.healthAsked
                                   ? "Tap to connect steps"
                                   : store.stepsNeedHelp
                                   ? "No steps yet. If Health access is off, turn it on in Settings > Privacy & Security > Health."
                                   : "From Apple Health. Floor: 2,500. Tap to refresh.",
                               value: "\(store.steps.formatted()) / 2,500", tint: .green) {
                        Task { await store.requestSteps() }
                    }
                    TimelineView(.periodic(from: .now, by: 60)) { _ in
                        CounterRow(icon: "clock", title: "Fast clock",
                                   subtitle: "Tap at your last bite",
                                   value: FastClock.label(hours: store.fastHours), tint: .blue) {
                            confirmLastBite = true
                        }
                    }
                    CounterRow(icon: "sun.max", title: "First Light",
                               subtitle: "10 minutes outside. Tap to start the timer.",
                               value: "\(store.lightMinutesToday)/10 min", tint: .yellow) { showLight = true }
                    CounterRow(icon: "drop", title: "Water before noon",
                               subtitle: store.waterBeforeNoon >= 2
                                   ? "Tap again to reset to 0."
                                   : "First glass before coffee. Tap for a glass.",
                               value: "\(store.waterBeforeNoon)/2", tint: .cyan) {
                        store.tapWater()
                    }
                    NavigationLink {
                        WeighInView()
                    } label: {
                        HStack {
                            Image(systemName: "scalemass").foregroundStyle(.purple).frame(width: 28)
                            VStack(alignment: .leading, spacing: 2) {
                                Text("Weigh-in")
                                Text("Once a week. Same scale, same morning.")
                                    .font(.caption).foregroundStyle(.secondary)
                            }
                            Spacer()
                            if let w = store.weighIns.last {
                                Text(String(format: "%.1f lb", w.pounds)).monospacedDigit().foregroundStyle(.secondary)
                            }
                        }
                    }
                }
                Section {
                    NavigationLink("One Walk, Five Boxes — morning mode") {
                        MorningModeView()
                    }
                }
                Section {
                    CounterRow(icon: "airpods.pro", title: "Count my chews",
                               subtitle: "Your AirPods count to 32 for you",
                               value: pro.isPro ? "" : (freeMealLeft ? "Free meal" : "Pro"), tint: .orange) {
                        if pro.isPro || freeMealLeft { showMeal = true } else { showPaywall = true }
                    }
                    CounterRow(icon: "chart.line.uptrend.xyaxis", title: "Trends",
                               subtitle: "Chews per meal and eating pace, by week",
                               value: pro.isPro ? "" : "Pro", tint: .indigo) {
                        if FreeMealRule.canSeeTrends(isPro: pro.isPro) { showTrends = true } else { showPaywall = true }
                    }
                }
                Section {
                    NavigationLink("About") { AboutView() }
                } footer: {
                    Text(AboutContent.homeFootnote)
                }
                #if DEBUG
                Section {
                    NavigationLink("Chew Lab — AirPods prototype") { ChewLabView() }
                    Toggle("Pretend Pro", isOn: $pro.pretendPro)
                } header: {
                    Text("Developer")
                } footer: {
                    Text("Debug builds only. Pretend Pro resets on every launch.")
                }
                #endif
                if !pro.isPro {
                    Section {
                        Button("Get Pro: chew counting and trends") { showPaywall = true }
                    }
                }
            }
            .navigationTitle("Count Yourself Skinny")
            .navigationDestination(isPresented: $showMeal) { MealView(leftFreeMeal: { showPaywall = true }) }
            .navigationDestination(isPresented: $showTrends) { TrendsView() }
            .sheet(isPresented: $showPacer) { BitePacerView() }
            .sheet(isPresented: $showPaywall) { PaywallView() }
            .sheet(isPresented: $showLight) { LightTimerView() }
            .sheet(isPresented: $showChewNumber, onDismiss: { chewResults = ChewNumberStore().load() }) { ChewNumberView() }
            .confirmationDialog("Log last bite now?", isPresented: $confirmLastBite, titleVisibility: .visible) {
                Button("Log last bite now") { store.tapLastBite() }
                Button("Cancel", role: .cancel) { }
            } message: {
                Text(AboutContent.fastNote)
            }
            .task { await store.refreshSteps() }
            .onAppear { refreshMealLog() }
            .onChange(of: showMeal) { _, _ in refreshMealLog() }
            .onChange(of: showPaywall) { _, _ in refreshMealLog() }
            // Fires at midnight and on clock or time zone changes, for a phone left on this screen.
            .onReceive(NotificationCenter.default.publisher(for: UIApplication.significantTimeChangeNotification)) { _ in
                store.rollover()
            }
        }
    }

    private func answerChewOffer() {
        ChewNumberStore().markOfferAnswered()
        chewOfferPending = false
    }
}

/// Offered once after the first run. The Home row takes over whatever the answer.
struct ChewNumberOfferCard: View {
    let take: () -> Void
    let notNow: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(ChewNumberCopy.title).font(.headline)
            Text(ChewNumberCopy.offer).font(.callout)
            // Non-default styles, or a List row would fire both buttons on one tap.
            Button(action: take) {
                Text("Find my number").frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            Button("Not now", action: notNow)
                .buttonStyle(.borderless)
                .font(.footnote)
                .foregroundStyle(.secondary)
                .frame(maxWidth: .infinity)
        }
        .padding(.vertical, 4)
    }
}

/// The handoff to My4MLife. NextDoorRule decides when it shows; this only shows it.
struct NextDoorCard: View {
    let take: () -> Void
    let notNow: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(AboutContent.nextDoorHeading).font(.headline)
            Text(AboutContent.nextDoorBody).font(.callout)
            Text(AboutContent.identityLine).font(.footnote).foregroundStyle(.secondary)
            // Non-default styles, or a List row would fire both buttons on one tap.
            Button(action: take) {
                Text(AboutContent.nextDoorButton).frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            Button("Not now", action: notNow)
                .buttonStyle(.borderless)
                .font(.footnote)
                .foregroundStyle(.secondary)
                .frame(maxWidth: .infinity)
        }
        .padding(.vertical, 4)
    }
}

struct CounterRow: View {
    let icon: String, title: String, value: String
    var subtitle: String?
    let tint: Color
    let action: () -> Void

    init(icon: String, title: String, subtitle: String? = nil, value: String, tint: Color,
         action: @escaping () -> Void) {
        self.icon = icon; self.title = title; self.subtitle = subtitle
        self.value = value; self.tint = tint; self.action = action
    }

    var body: some View {
        Button(action: action) {
            HStack {
                Image(systemName: icon).foregroundStyle(tint).frame(width: 28)
                VStack(alignment: .leading, spacing: 2) {
                    Text(title)
                    if let subtitle {
                        Text(subtitle).font(.caption).foregroundStyle(.secondary)
                    }
                }
                Spacer()
                Text(value).monospacedDigit().foregroundStyle(.secondary)
            }
            .contentShape(Rectangle())   // whole row is tappable, not just the text
        }
        .buttonStyle(.plain)
    }
}

/// The evening question and the streak. Logic lives in StreakEngine; this only shows it.
struct StreakCard: View {
    let streak: Int
    let longest: Int
    let todayAnswer: Bool?
    let missedYesterday: Bool
    let answer: (Bool) -> Void

    var body: some View {
        VStack(spacing: 8) {
            Text("\(streak)").font(.system(size: 56, weight: .bold)).monospacedDigit()
            Text(streak == 1 ? "day in a row" : "days in a row").foregroundStyle(.secondary)
            if longest > 0 {
                Text("Longest: \(longest)").font(.caption).foregroundStyle(.secondary)
            }
            if missedYesterday && todayAnswer != true {
                Text("Never miss twice.").font(.headline).foregroundStyle(.orange)
            }
            Divider()
            Text("Did you hit your counts today?").font(.headline)
            HStack(spacing: 12) {
                answerButton("Yes", hit: true)
                answerButton("No", hit: false)
            }
            if let todayAnswer {
                Text(todayAnswer ? "Logged: yes. Tap No to change it." : "Logged: no. Tap Yes to change it.")
                    .font(.caption).foregroundStyle(.secondary)
            }
            Text("A shrunk day still counts.").font(.footnote).foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 8)
    }

    @ViewBuilder
    private func answerButton(_ title: String, hit: Bool) -> some View {
        let chosen = todayAnswer == hit
        Button { answer(hit) } label: {
            Text(title).frame(maxWidth: .infinity)
        }
        .buttonStyle(.borderedProminent)
        .tint(chosen ? (hit ? .green : .gray) : .secondary.opacity(0.35))
        .foregroundStyle(chosen ? Color.white : Color.primary)
        .accessibilityValue(chosen ? "selected" : "")
    }
}
