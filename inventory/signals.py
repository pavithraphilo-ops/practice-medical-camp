from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import MedicalCamp
from .models import Medicine
from .models import CampWiseStock
from .models import Issue
from django.db.models.signals import post_save, post_delete


@receiver(post_save, sender=MedicalCamp)
def create_camp_stock(sender, instance, created, **kwargs):

    if created:

        medicines = Medicine.objects.all()

        for medicine in medicines:

            CampWiseStock.objects.create(
                camp=instance,
                medicine=medicine,
                allocated_stock=0,
                used_stock=0
            )

@receiver(post_save, sender=Issue)
def update_camp_stock_on_issue(sender, instance, created, **kwargs):
    """Updates used_stock when a new Issue is created."""
    if created:
        camp_stock, _ = CampWiseStock.objects.get_or_create(
            camp=instance.camp,
            medicine=instance.medicine,
            defaults={'allocated_stock': 0, 'used_stock': 0}
        )
        camp_stock.used_stock += instance.qty
        camp_stock.save()

@receiver(post_delete, sender=Issue)
def update_camp_stock_on_delete(sender, instance, **kwargs):
    """Decrements used_stock when an Issue is deleted."""
    try:
        camp_stock = CampWiseStock.objects.get(
            camp=instance.camp,
            medicine=instance.medicine
        )
        camp_stock.used_stock -= instance.qty
        camp_stock.save()
    except CampWiseStock.DoesNotExist:
        pass