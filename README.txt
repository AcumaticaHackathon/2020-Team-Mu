web.config updates:

1) Update dependent assembly for System.Collections.Immutable (we have 1.2.3)
 <dependentAssembly>
	<assemblyIdentity name="System.Collections.Immutable" publicKeyToken="b03f5f7f11d50a3a" culture="neutral" />
	<bindingRedirect oldVersion="0.0.0.0-1.2.3.0" newVersion="1.2.3.0" />
</dependentAssembly>

2) Add netstandard ref

      <assemblies>
        <add assembly="netstandard, Version=2.0.0.0, Culture=neutral, PublicKeyToken=cc7b13ffcd2ddd51"/>
