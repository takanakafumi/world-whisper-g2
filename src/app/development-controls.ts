export interface DevelopmentControlPort {
  triggerNotification(): Promise<void>
  dismissDisplay(): Promise<void>
  setAutoDismissEnabled(enabled: boolean): void
}

export class DevelopmentControls {
  private readonly notifyButton: HTMLButtonElement | null
  private readonly dismissButton: HTMLButtonElement | null
  private readonly autoDismissToggle: HTMLInputElement | null

  constructor(
    notifySelector: string,
    dismissSelector: string,
    autoDismissSelector: string,
    private readonly controller: DevelopmentControlPort,
  ) {
    this.notifyButton = document.querySelector<HTMLButtonElement>(notifySelector)
    this.dismissButton = document.querySelector<HTMLButtonElement>(dismissSelector)
    this.autoDismissToggle = document.querySelector<HTMLInputElement>(autoDismissSelector)
  }

  start() {
    this.notifyButton?.addEventListener('click', () => void this.run('notify'))
    this.dismissButton?.addEventListener('click', () => void this.run('dismiss'))
    this.autoDismissToggle?.addEventListener('change', () => {
      this.controller.setAutoDismissEnabled(this.autoDismissToggle?.checked ?? true)
    })
  }

  private async run(action: 'notify' | 'dismiss') {
    this.setDisabled(true)
    try {
      if (action === 'notify') await this.controller.triggerNotification()
      else await this.controller.dismissDisplay()
    } finally {
      this.setDisabled(false)
    }
  }

  private setDisabled(disabled: boolean) {
    if (this.notifyButton) this.notifyButton.disabled = disabled
    if (this.dismissButton) this.dismissButton.disabled = disabled
  }
}

