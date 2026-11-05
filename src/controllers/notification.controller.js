export class NotificationController {
  constructor({ notificationService }) {
    this.notificationService = notificationService;
  }

  getNotifications = async (req, res) => {
    res.json(
      await this.notificationService.getNotifications(req.userId, req.query),
    );
  };

  markRead = async (req, res) => {
    await this.notificationService.markRead(req.userId, req.params.id);
    res.status(204).end();
  };
}
