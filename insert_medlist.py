import django
import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'medicalcamp_inventory.settings')
django.setup()

import pandas as pd
import tqdm
from inventory.models import Medicine, MedicineCategory

med_list = pd.read_csv('medlist.csv').fillna('').to_dict('records')
for med_record in tqdm.tqdm(med_list):
    medicine = Medicine()
    medicine.uqid = int(med_record['UQID'])
    medicine.name = med_record['Name']
    category, _ = MedicineCategory.objects.get_or_create(
        short_code=med_record['Category'],
        defaults={'name': med_record['Category']}
    )
    medicine.category = category
    medicine.formulation = med_record['Formulation']
    medicine.stock = 0
    medicine.save()
