# AcuShell
==========

Customization project for Acumatica that adds a c# console to all screens. AcuShell allows live browser-based troubleshooting of Acumatica.
With AcuShell you can:
- access and update values on the current graph;
- change internal variables on the fly;
- execute BQL statement;
- destroy your entire Acumatica instance (use with care :D)

## Dependencies

To get intellisense, you need the following customization project installed: https://github.com/gmichaud/Velixo-AcumaticaCodeEditor/tree/hackathon2020

## Hardcoded thingy:

### path to save the c# script generated on the fly:
- C:\Program Files\Acumatica ERP\AcumaticaDemo2019R2\CstDesigner\Console_OmniSharp <= this path needs to exists.

### web.config updates:

1) Update dependent assembly for System.Collections.Immutable (we have 1.2.3)
 <dependentAssembly>
	<assemblyIdentity name="System.Collections.Immutable" publicKeyToken="b03f5f7f11d50a3a" culture="neutral" />
	<bindingRedirect oldVersion="0.0.0.0-1.2.3.0" newVersion="1.2.3.0" />
</dependentAssembly>

2) Add netstandard ref

      <assemblies>
        <add assembly="netstandard, Version=2.0.0.0, Culture=neutral, PublicKeyToken=cc7b13ffcd2ddd51"/>
