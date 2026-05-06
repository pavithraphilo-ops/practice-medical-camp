from django.contrib import admin
from .models import Medicine, MedicineCategory, MedicalCamp, MedicalCampVenue, Issue, Vitals, TestIssue, MedicalTest


# Register your models here.

class MedicineAdmin(admin.ModelAdmin):
    list_display = ['uqid', 'name', 'formulation', 'category', 'stock', 'expiry_date']
    list_filter = ['category', 'expiry_date']
    search_fields = ['uqid', 'name', 'category']


class VitalsAdmin(admin.ModelAdmin):
    list_display = ['patient_id', 'camp', 'blood_pressure', 'glucose', 'haemoglobin']
    list_filter = ['camp']
    
    

admin.site.register(Medicine, MedicineAdmin)
admin.site.register(MedicineCategory)
admin.site.register(MedicalCamp)
admin.site.register(MedicalCampVenue)
admin.site.register(Issue)
admin.site.register(Vitals, VitalsAdmin)
admin.site.register(MedicalTest)
admin.site.register(TestIssue)