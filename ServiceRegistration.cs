using System.Linq;
using System.Reflection;
using Autofac;
using PX.Data.DependencyInjection;
using PX.Web.UI;
using Module = Autofac.Module;

namespace AcuShell
{
    public class ServiceRegistration : Module
    {
        protected override void Load(ContainerBuilder builder)
        {
            builder.RegisterType<ConsoleTitleModule>().As<ITitleModule>();
        }
    }
}
