from django import forms


class TripPlannerForm(forms.Form):

    source = forms.CharField(
        max_length=255,
        widget=forms.TextInput(
            attrs={
                "class": "form-control",
                "placeholder": "Enter Source"
            }
        )
    )

    destination = forms.CharField(
        max_length=255,
        widget=forms.TextInput(
            attrs={
                "class": "form-control",
                "placeholder": "Enter Destination"
            }
        )
    )