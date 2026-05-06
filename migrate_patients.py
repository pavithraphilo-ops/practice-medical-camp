import os
import django

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'medicalcamp_inventory.settings')
django.setup()

from inventory.models import Vitals, Patient

def populate_patients():
    # Get unique patient IDs from Vitals
    patient_ids = Vitals.objects.values_list('patient_id', flat=True).distinct()
    
    count = 0
    for pid in patient_ids:
        # Get the earliest vital record for this patient to get registered_date and camp_no
        earliest_vital = Vitals.objects.filter(patient_id=pid).order_by('camp__date').first()
        
        reg_date = None
        camp_num = None
        if earliest_vital:
            reg_date = earliest_vital.camp.date
            camp_num = earliest_vital.camp.number
            
        patient, created = Patient.objects.get_or_create(
            patient_id=pid,
            defaults={
                'registered_date': reg_date,
                'camp_no': camp_num
            }
        )
        if created:
            count += 1
            print(f"Created Patient record for ID: {pid}")
            
    print(f"Total new patients created: {count}")

if __name__ == "__main__":
    populate_patients()
