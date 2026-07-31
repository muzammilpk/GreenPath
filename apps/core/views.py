from django.shortcuts import render


def home(request):#if someone visit local host django will executes this function
    return render(request, "core/home.html")#tells Django :Open this HTML page and send it back to the browser.

