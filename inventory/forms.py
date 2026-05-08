from .models import PatientMedicineIssue, MedicalCamp
from django import forms

class IssueForm(forms.Form):
    patient_id = forms.IntegerField()
    medical_camp = forms.ModelChoiceField(queryset=MedicalCamp.objects.order_by('-date'), initial=0)

class VitalsForm(forms.Form):
    patient_id = forms.IntegerField()
    medical_camp = forms.ModelChoiceField(queryset=MedicalCamp.objects.order_by('-date'), initial=0)
    blood_pressure = forms.CharField(initial = "NA")
    glucose = forms.CharField(initial = "NA")
    haemoglobin = forms.CharField(initial = "NA")
