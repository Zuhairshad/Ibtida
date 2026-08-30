import SwiftUI
import UIKit
import FamilyControls

// -----------------------------------------------------------------------------
// SwiftUI content
// -----------------------------------------------------------------------------

/// The SwiftUI content shown inside the sheet presented by `pickAppsToBlock()`.
///
/// Apple's `FamilyActivityPicker` (from the `FamilyControls` framework)
/// renders its own search field and the checkbox list of installed
/// apps/categories/websites, but — per Apple's WWDC22 "Meet Family Controls"
/// session and sample code — the `init(headerText:selection:)` form used
/// here does NOT include its own navigation chrome or a way to signal
/// "done"; that's left to the embedding app. We wrap it in a
/// `NavigationStack` with explicit Cancel/Done toolbar buttons so we can hand
/// the final `FamilyActivitySelection` back to native code exactly once.
@available(iOS 16.0, *)
struct IbadahAppPickerView: View {
  @State private var selection: FamilyActivitySelection
  private let onDone: (FamilyActivitySelection) -> Void
  private let onCancel: () -> Void

  init(
    initialSelection: FamilyActivitySelection,
    onDone: @escaping (FamilyActivitySelection) -> Void,
    onCancel: @escaping () -> Void
  ) {
    self._selection = State(initialValue: initialSelection)
    self.onDone = onDone
    self.onCancel = onCancel
  }

  var body: some View {
    NavigationStack {
      FamilyActivityPicker(
        headerText: "Choose the apps to include in your Ibadah Lock",
        selection: $selection
      )
      .navigationTitle("Block Apps")
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .cancellationAction) {
          Button("Cancel", action: onCancel)
        }
        ToolbarItem(placement: .confirmationAction) {
          Button("Done") { onDone(selection) }
        }
      }
    }
  }
}

// -----------------------------------------------------------------------------
// UIKit bridge
// -----------------------------------------------------------------------------

/// Bridges `IbadahAppPickerView` into the UIKit view-controller world the
/// Expo Modules API deals in. Kept as its own small type (rather than inlined
/// in `IbadahNativeModule`) so the module file stays focused on the Expo
/// `Function`/`AsyncFunction` wiring.
///
/// The Expo Modules API has no first-class "present a SwiftUI sheet" surface
/// of its own — the documented pattern (see e.g. `expo-web-browser`'s
/// `WebBrowserSession` in this same node_modules tree) is to fetch the
/// current `UIViewController` via `appContext.utilities?.currentViewController()`
/// and call UIKit's own `present(_:animated:)` on it, which is exactly what
/// the caller of `present(on:onDone:onCancel:)` below does.
@available(iOS 16.0, *)
final class IbadahAppPickerPresenter {
  /// Retained for the lifetime of the presented sheet so the hosting
  /// controller (and its SwiftUI state) isn't torn down mid-picker; the
  /// module that owns this presenter drops its reference once `onDone`/
  /// `onCancel` fires.
  private var hostingController: UIHostingController<IbadahAppPickerView>?

  /// Presents the picker modally on top of `presenter`. Calls exactly one of
  /// `onDone`/`onCancel` exactly once, dismissing the sheet first either way.
  /// Must be called on the main thread (UIKit presentation requirement).
  func present(
    on presenter: UIViewController,
    onDone: @escaping (FamilyActivitySelection) -> Void,
    onCancel: @escaping () -> Void
  ) {
    let host = UIHostingController(
      rootView: IbadahAppPickerView(
        initialSelection: FamilyActivitySelection(),
        onDone: { [weak presenter] selection in
          presenter?.dismiss(animated: true)
          onDone(selection)
        },
        onCancel: { [weak presenter] in
          presenter?.dismiss(animated: true)
          onCancel()
        }
      )
    )
    host.modalPresentationStyle = .formSheet
    self.hostingController = host
    presenter.present(host, animated: true)
  }
}
