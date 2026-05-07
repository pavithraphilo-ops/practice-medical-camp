from django.contrib import admin
from .models import Medicine, MedicineCategory, MedicalCamp, MedicalCampVenue, Issue, Vitals, PatientVitals, TestIssue, MedicalTest, CampWiseStock


# Register your models here.

class MedicineAdmin(admin.ModelAdmin):
    list_display = ['uqid', 'name', 'formulation', 'category', 'stock', 'expiry_date']
    list_filter = ['category', 'expiry_date']
    search_fields = ['uqid', 'name', 'category']


class VitalsAdmin(admin.ModelAdmin):
    list_display = ['patient_id', 'camp', 'blood_pressure', 'glucose', 'haemoglobin']
    list_filter = ['camp']

class IssueInline(admin.TabularInline):
    model = Issue
    extra = 0
    fields = ['medicine', 'qty', 'strength', 'days', 'morning', 'afternoon', 'night']

class PatientVitalsAdmin(admin.ModelAdmin):
    list_display = ['patient_id', 'camp', 'date', 'weight', 'blood_pressure', 'glucose', 'pulse', 'dr_name']
    list_filter = ['camp', 'date', 'dr_name']
    search_fields = ['patient_id', 'diagnosis', 'dr_name']
    inlines = [IssueInline]
    
    

admin.site.register(Medicine, MedicineAdmin)
admin.site.register(MedicineCategory)
admin.site.register(MedicalCamp)
admin.site.register(MedicalCampVenue)
admin.site.register(Issue)
admin.site.register(Vitals, VitalsAdmin)
admin.site.register(PatientVitals, PatientVitalsAdmin)
admin.site.register(MedicalTest)
admin.site.register(TestIssue)

class CampWiseStockAdmin(admin.ModelAdmin):
    list_display = ['camp', 'medicine_name', 'allocated_stock', 'used_stock', 'remaining_stock_display']
    list_filter = ['camp', 'medicine']
    search_fields = ['medicine__name', 'camp__venue']

    def medicine_name(self, obj):
        return obj.medicine.name
    
    def remaining_stock_display(self, obj):
        return obj.remaining_stock()
    remaining_stock_display.short_description = 'Remaining'

admin.site.register(CampWiseStock, CampWiseStockAdmin)